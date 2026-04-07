from fastapi import APIRouter
from app.api.v1 import auth, stocks, portfolio, alerts, model, data

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(stocks.router)
api_router.include_router(portfolio.router)
api_router.include_router(alerts.router)
api_router.include_router(model.router)
api_router.include_router(data.router)