from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Portfolio, Alert
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/data", tags=["Data"])


@router.get("/export")
def export_all_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """匯出完整用戶資料（投資組合 + 價格提醒）"""
    
    # 匯出投資組合
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()
    portfolio_data = []
    for p in portfolios:
        portfolio_data.append({
            "stock_code": p.stock_code,
            "stock_name": p.stock_name,
            "shares": p.shares,
            "avg_price": p.avg_price,
            "buy_date": p.buy_date.isoformat() if p.buy_date else None,
            "fee": p.fee
        })
    
    # 匯出價格提醒
    alerts = db.query(Alert).filter(Alert.user_id == current_user.id).all()
    alert_data = []
    for a in alerts:
        alert_data.append({
            "stock_code": a.stock_code,
            "condition": a.condition,
            "target_price": a.target_price,
            "is_active": a.is_active
        })
    
    return {
        "type": "full_backup",
        "version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "user": {
            "email": current_user.email,
            "full_name": current_user.full_name
        },
        "portfolio": {
            "count": len(portfolio_data),
            "data": portfolio_data
        },
        "alerts": {
            "count": len(alert_data),
            "data": alert_data
        }
    }


@router.post("/import")
def import_all_data(
    import_data: dict,
    mode: str = "replace",  # merge or replace
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """匯入完整用戶資料"""
    try:
        if import_data.get("type") != "full_backup":
            raise HTTPException(status_code=400, detail="Invalid data format")
        
        portfolio_items = import_data.get("portfolio", {}).get("data", [])
        alert_items = import_data.get("alerts", {}).get("data", [])
        
        imported_portfolio = 0
        imported_alerts = 0
        
        if mode == "replace":
            # 刪除現有資料
            db.query(Portfolio).filter(Portfolio.user_id == current_user.id).delete()
            db.query(Alert).filter(Alert.user_id == current_user.id).delete()
        
        # 匯入投資組合
        for item in portfolio_items:
            buy_date = None
            bd = item.get("buy_date")
            if bd:
                try:
                    buy_date = datetime.fromisoformat(bd.replace('Z', '+00:00'))
                except:
                    buy_date = None
            
            new_p = Portfolio(
                user_id=current_user.id,
                stock_code=item.get("stock_code"),
                stock_name=item.get("stock_name"),
                shares=item.get("shares", 0),
                avg_price=item.get("avg_price", 0),
                buy_date=buy_date,
                fee=item.get("fee", 0)
            )
            db.add(new_p)
            imported_portfolio += 1
        
        # 匯入價格提醒
        for item in alert_items:
            new_alert = Alert(
                user_id=current_user.id,
                stock_code=item.get("stock_code"),
                condition=item.get("condition", "above"),
                target_price=item.get("target_price", 0),
                is_active=item.get("is_active", True)
            )
            db.add(new_alert)
            imported_alerts += 1
        
        db.commit()
        
        return {
            "success": True,
            "imported": {
                "portfolio": imported_portfolio,
                "alerts": imported_alerts
            },
            "mode": mode
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
