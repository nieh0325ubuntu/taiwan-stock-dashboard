from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Alert
from app.schemas.user import AlertCreate, AlertResponse
from app.api.v1.auth import get_current_user
from app.services.stock import get_stock_info

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/pending")
def get_pending_alerts(db: Session = Depends(get_db)):
    """
    取得所有待檢查的價格提醒（供 Scheduler 使用）

    只回傳已綁定 Telegram 且啟用中的提醒，並附上現價
    """
    from app.services.stock import get_stock_info

    alerts = (
        db.query(Alert)
        .filter(Alert.is_active == True)
        .join(User)
        .filter(User.telegram_chat_id != None)
        .all()
    )

    result = []
    for alert in alerts:
        stock_data = get_stock_info(alert.stock_code)
        current_price = (
            stock_data["price"] if stock_data and stock_data.get("price", 0) > 0 else 0
        )

        result.append(
            {
                "id": alert.id,
                "user_id": alert.user_id,
                "stock_code": alert.stock_code,
                "name": stock_data.get("name", alert.stock_code)
                if stock_data
                else alert.stock_code,
                "condition": alert.condition,
                "target_price": alert.target_price,
                "is_active": alert.is_active,
                "telegram_chat_id": alert.user.telegram_chat_id,
                "current_price": current_price,
                "high": stock_data.get("high", 0) if stock_data else 0,
                "low": stock_data.get("low", 0) if stock_data else 0,
                "volume": stock_data.get("volume", 0) if stock_data else 0,
                "updated": stock_data.get("updated", "") if stock_data else "",
            }
        )

    return result


@router.patch("/{alert_id}/mark-triggered")
def mark_alert_triggered(alert_id: int, db: Session = Depends(get_db)):
    """標記提醒為已觸發（供 Scheduler 內部呼叫）"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_active = False
    alert.triggered_at = datetime.utcnow()
    db.commit()

    return {"message": "Alert marked as triggered"}


@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    alerts = db.query(Alert).filter(Alert.user_id == current_user.id).all()
    return alerts


@router.post("/", response_model=AlertResponse, status_code=201)
def create_alert(
    alert: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if alert.condition not in ["above", "below"]:
        raise HTTPException(
            status_code=400, detail="Condition must be 'above' or 'below'"
        )

    new_alert = Alert(
        user_id=current_user.id,
        stock_code=alert.stock_code,
        condition=alert.condition,
        target_price=alert.target_price,
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert


@router.delete("/{alert_id}", status_code=204)
def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id, Alert.user_id == current_user.id)
        .first()
    )

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    db.delete(alert)
    db.commit()
    return None


@router.post("/{alert_id}/trigger", status_code=200)
def trigger_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert or not alert.is_active:
        raise HTTPException(status_code=404, detail="Alert not found or inactive")

    realtime = get_stock_realtime(alert.stock_code)
    if not realtime:
        raise HTTPException(status_code=400, detail="Cannot get stock price")

    current_price = realtime["price"]
    triggered = False

    if alert.condition == "above" and current_price >= alert.target_price:
        triggered = True
    elif alert.condition == "below" and current_price <= alert.target_price:
        triggered = True

    if triggered:
        alert.is_active = False
        alert.triggered_at = datetime.utcnow()
        db.commit()

        # 發送 Telegram 通知
        from app.services.alerts_scheduler import send_telegram_message

        if alert.user.telegram_chat_id:
            condition_text = "已突破 📈" if alert.condition == "above" else "已跌破 📉"
            message = (
                f"🔔 *價格提醒*\n\n"
                f"📊 **{alert.stock_code}** {condition_text}\n"
                f"🎯 目標價格：{alert.target_price:.2f}\n"
                f"💰 現價：{current_price:.2f}"
            )
            send_telegram_message(alert.user.telegram_chat_id, message)

        return {"triggered": True, "current_price": current_price}

    return {"triggered": False, "current_price": current_price}


@router.get("/export")
def export_alerts(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """匯出價格提醒為 JSON"""
    alerts = db.query(Alert).filter(Alert.user_id == current_user.id).all()

    data = []
    for a in alerts:
        data.append(
            {
                "stock_code": a.stock_code,
                "condition": a.condition,
                "target_price": a.target_price,
                "is_active": a.is_active,
            }
        )

    return {
        "type": "alerts",
        "version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "count": len(data),
        "data": data,
    }


@router.post("/import")
def import_alerts(
    import_data: dict,
    mode: str = "merge",  # merge or replace
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """匯入價格提醒"""
    try:
        if import_data.get("type") != "alerts":
            raise HTTPException(status_code=400, detail="Invalid data format")

        items = import_data.get("data", [])

        if mode == "replace":
            # 刪除現有資料
            db.query(Alert).filter(Alert.user_id == current_user.id).delete()

        imported_count = 0
        for item in items:
            new_alert = Alert(
                user_id=current_user.id,
                stock_code=item.get("stock_code"),
                condition=item.get("condition", "above"),
                target_price=item.get("target_price", 0),
                is_active=item.get("is_active", True),
            )
            db.add(new_alert)
            imported_count += 1

        db.commit()

        return {"success": True, "imported": imported_count, "mode": mode}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
