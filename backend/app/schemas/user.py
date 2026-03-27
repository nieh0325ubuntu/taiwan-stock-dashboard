from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: str  # Using plain str for now
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    telegram_chat_id: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class PortfolioCreate(BaseModel):
    stock_code: str
    stock_name: Optional[str] = None
    shares: int
    avg_price: float
    buy_date: Optional[str] = None
    fee: Optional[float] = 0


class PortfolioUpdate(BaseModel):
    shares: Optional[int] = None
    avg_price: Optional[float] = None
    buy_date: Optional[str] = None
    fee: Optional[float] = None


class PortfolioResponse(BaseModel):
    id: int
    user_id: int
    stock_code: str
    stock_name: Optional[str]
    shares: int
    avg_price: float
    buy_date: Optional[str] = None
    fee: float = 0
    created_at: datetime
    updated_at: datetime
    current_price: Optional[float] = None
    profit_loss: Optional[float] = None
    profit_loss_percent: Optional[float] = None
    days_held: Optional[int] = None
    roi_percent: Optional[float] = None

    class Config:
        from_attributes = True


class AlertCreate(BaseModel):
    stock_code: str
    condition: str
    target_price: float


class AlertResponse(BaseModel):
    id: int
    user_id: int
    stock_code: str
    condition: str
    target_price: float
    is_active: bool
    triggered_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True