from fastapi import APIRouter, Query
from app.services.stock import (
    get_stock_info,
    get_stock_realtime,
    search_stocks,
    get_stock_historical,
    get_stock_indicators
)

router = APIRouter(prefix="/stocks", tags=["Stocks"])


@router.get("/search")
def search(keyword: str = Query(..., min_length=1)):
    results = search_stocks(keyword)
    return {"results": results}


@router.get("/{stock_code}")
def get_stock(stock_code: str):
    info = get_stock_info(stock_code)
    if info and info.get("price", 0) > 0:
        return info
    
    if info:
        return info
    
    return {
        "code": stock_code,
        "name": stock_code,
        "price": 0,
        "change": 0,
        "change_percent": 0,
        "open": 0,
        "high": 0,
        "low": 0,
        "close": 0,
        "volume": 0,
        "turnover": 0
    }


@router.get("/{stock_code}/realtime")
def get_realtime(stock_code: str):
    info = get_stock_realtime(stock_code)
    if info and info.get("price", 0) > 0:
        return info
    
    if info:
        return info
    
    return {
        "code": stock_code,
        "name": stock_code,
        "price": 0,
        "change": 0,
        "volume": 0
    }


@router.get("/{stock_code}/history")
def get_history(stock_code: str, days: int = Query(90, ge=1, le=365)):
    data = get_stock_historical(stock_code, days)
    return {"data": data}


@router.get("/{stock_code}/indicators")
def get_indicators(stock_code: str):
    indicators = get_stock_indicators(stock_code)
    if indicators:
        return indicators
    return {
        "code": stock_code,
        "name": stock_code,
        "current_price": 0,
        "ma5": 0,
        "ma10": 0,
        "ma20": 0,
        "ma60": 0,
        "rsi": 50,
        "kd_k": 50,
        "kd_d": 50
    }