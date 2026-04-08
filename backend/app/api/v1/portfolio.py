from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Portfolio
from app.schemas.user import PortfolioCreate, PortfolioUpdate, PortfolioResponse
from app.api.v1.auth import get_current_user
from app.services.stock import get_stock_realtime, STOCK_NAMES

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("/", response_model=List[PortfolioResponse])
def get_portfolio(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()

    result = []
    for p in portfolios:
        realtime = get_stock_realtime(p.stock_code)
        current_price = (
            realtime["price"] if realtime and realtime.get("price", 0) > 0 else None
        )

        stock_name = p.stock_name
        if not stock_name:
            stock_name = STOCK_NAMES.get(p.stock_code)

        profit_loss = None
        profit_loss_percent = None
        days_held = None
        roi_percent = None

        if current_price:
            profit_loss = (current_price - p.avg_price) * p.shares
            profit_loss_percent = ((current_price - p.avg_price) / p.avg_price) * 100

        if p.buy_date:
            days_held = (datetime.utcnow() - p.buy_date.replace(tzinfo=None)).days
            total_cost = (p.avg_price * p.shares) + p.fee
            if total_cost > 0 and current_price:
                roi_percent = (
                    (current_price * p.shares - p.fee) / total_cost - 1
                ) * 100

        buy_date_str = p.buy_date.isoformat() if p.buy_date else None

        result.append(
            PortfolioResponse(
                id=p.id,
                user_id=p.user_id,
                stock_code=p.stock_code,
                stock_name=stock_name,
                shares=p.shares,
                avg_price=p.avg_price,
                buy_date=buy_date_str,
                fee=p.fee,
                created_at=p.created_at,
                updated_at=p.updated_at,
                current_price=current_price,
                profit_loss=round(profit_loss, 2) if profit_loss else None,
                profit_loss_percent=round(profit_loss_percent, 2)
                if profit_loss_percent
                else None,
                days_held=days_held,
                roi_percent=round(roi_percent, 2) if roi_percent else None,
            )
        )

    return result


@router.post("/", response_model=PortfolioResponse, status_code=201)
def add_portfolio(
    portfolio: PortfolioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        buy_date = None
        pd = portfolio.buy_date
        if pd and isinstance(pd, str):
            try:
                buy_date = datetime.fromisoformat(pd.replace("Z", "+00:00"))
            except:
                buy_date = None

        stock_name = portfolio.stock_name
        if not stock_name:
            stock_name = STOCK_NAMES.get(portfolio.stock_code)

        new_p = Portfolio(
            user_id=current_user.id,
            stock_code=portfolio.stock_code,
            stock_name=stock_name,
            shares=portfolio.shares,
            avg_price=portfolio.avg_price,
            buy_date=buy_date,
            fee=portfolio.fee or 0,
        )
        db.add(new_p)
        db.commit()
        db.refresh(new_p)

        return PortfolioResponse(
            id=new_p.id,
            user_id=new_p.user_id,
            stock_code=new_p.stock_code,
            stock_name=new_p.stock_name,
            shares=new_p.shares,
            avg_price=new_p.avg_price,
            buy_date=new_p.buy_date.isoformat() if new_p.buy_date else None,
            fee=new_p.fee,
            created_at=new_p.created_at,
            updated_at=new_p.updated_at,
            current_price=None,
            profit_loss=None,
            profit_loss_percent=None,
            days_held=None,
            roi_percent=None,
        )
    except Exception as e:
        db.rollback()
        import traceback

        return {"error": str(e), "trace": traceback.format_exc()}


@router.put("/{portfolio_id}", response_model=PortfolioResponse)
def update_portfolio(
    portfolio_id: int,
    portfolio_update: PortfolioUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id, Portfolio.user_id == current_user.id)
        .first()
    )

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if portfolio_update.shares is not None:
        portfolio.shares = portfolio_update.shares
    if portfolio_update.avg_price is not None:
        portfolio.avg_price = portfolio_update.avg_price
    if portfolio_update.buy_date is not None:
        portfolio.buy_date = portfolio_update.buy_date
    if portfolio_update.fee is not None:
        portfolio.fee = portfolio_update.fee

    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.delete("/{portfolio_id}", status_code=204)
def delete_portfolio(
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id, Portfolio.user_id == current_user.id)
        .first()
    )

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    db.delete(portfolio)
    db.commit()
    return None


@router.get("/export")
def export_portfolio(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()

    data = []
    for p in portfolios:
        data.append(
            {
                "stock_code": p.stock_code,
                "stock_name": p.stock_name,
                "shares": p.shares,
                "avg_price": p.avg_price,
                "buy_date": p.buy_date.isoformat() if p.buy_date else None,
                "fee": p.fee,
            }
        )

    return {
        "type": "portfolio",
        "version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "count": len(data),
        "data": data,
    }


@router.post("/import")
def import_portfolio(
    import_data: dict,
    mode: str = "merge",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if import_data.get("type") != "portfolio":
            raise HTTPException(status_code=400, detail="Invalid data format")

        items = import_data.get("data", [])

        if mode == "replace":
            db.query(Portfolio).filter(Portfolio.user_id == current_user.id).delete()

        imported_count = 0
        for item in items:
            buy_date = None
            bd = item.get("buy_date")
            if bd:
                try:
                    buy_date = datetime.fromisoformat(bd.replace("Z", "+00:00"))
                except:
                    buy_date = None

            new_p = Portfolio(
                user_id=current_user.id,
                stock_code=item.get("stock_code"),
                stock_name=item.get("stock_name"),
                shares=item.get("shares", 0),
                avg_price=item.get("avg_price", 0),
                buy_date=buy_date,
                fee=item.get("fee", 0),
            )
            db.add(new_p)
            imported_count += 1

        db.commit()

        return {"success": True, "imported": imported_count, "mode": mode}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
