from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    telegram_chat_id = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    portfolios = relationship("Portfolio", back_populates="user")
    alerts = relationship("Alert", back_populates="user")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stock_code = Column(String(10), nullable=False)
    stock_name = Column(String(100))
    shares = Column(Integer, nullable=False)
    avg_price = Column(Float, nullable=False)
    buy_date = Column(DateTime, default=datetime.utcnow)
    fee = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="portfolios")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stock_code = Column(String(10), nullable=False)
    condition = Column(String(10), nullable=False)
    target_price = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    triggered_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="alerts")