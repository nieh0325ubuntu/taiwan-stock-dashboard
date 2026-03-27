from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Alert
from app.schemas.user import AlertCreate, AlertResponse
from app.api.v1.auth import get_current_user
from app.services.stock import get_stock_realtime

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alerts = db.query(Alert).filter(Alert.user_id == current_user.id).all()
    return alerts


@router.post("/", response_model=AlertResponse, status_code=201)
def create_alert(
    alert: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if alert.condition not in ["above", "below"]:
        raise HTTPException(status_code=400, detail="Condition must be 'above' or 'below'")

    new_alert = Alert(
        user_id=current_user.id,
        stock_code=alert.stock_code,
        condition=alert.condition,
        target_price=alert.target_price
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert


@router.delete("/{alert_id}", status_code=204)
def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == current_user.id
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    db.delete(alert)
    db.commit()
    return None


@router.post("/{alert_id}/trigger", status_code=200)
def trigger_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
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
        return {"triggered": True, "current_price": current_price}

    return {"triggered": False, "current_price": current_price}