from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token, UserLogin
from app.services.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
)
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# In-memory bind code storage (code -> {chat_id, email, expires})
# In production, use Redis
BIND_CODES: dict = {}


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/bind-telegram", status_code=status.HTTP_200_OK)
def bind_telegram(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.telegram_chat_id = chat_id
    db.commit()
    return {"message": "Telegram account bound successfully"}


@router.post("/bind-telegram-by-code", status_code=status.HTTP_200_OK)
def bind_telegram_by_code(
    bind_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    透過驗證碼綁定 Telegram

    流程：
    1. Bot 產生驗證碼並顯示給用戶 (使用 /bind-telegram-create-code)
    2. 用戶在網站設定頁面輸入驗證碼
    3. 此 API 驗證並完成綁定
    """
    if not bind_code or len(bind_code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="驗證碼格式錯誤，應為 6 位英數字",
        )

    # 檢查驗證碼是否存在且匹配當前用戶 email
    valid_code = None
    data = BIND_CODES.get(bind_code)
    if data and data["email"] == current_user.email:
        valid_code = data["chat_id"]

    if not valid_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="驗證碼無效或已過期，請重新在 Telegram 中執行 /bind",
        )

    # 綁定 chat_id 到用戶
    current_user.telegram_chat_id = valid_code
    db.commit()

    # 清除已使用的驗證碼
    del BIND_CODES[bind_code]

    return {"message": "Telegram 綁定成功！", "telegram_chat_id": valid_code}


@router.post("/bind-telegram-create-code", status_code=status.HTTP_200_OK)
def create_bind_code(
    request: dict,
    db: Session = Depends(get_db),
):
    """
    Telegram Bot 呼叫此 API 產生驗證碼
    """
    import random
    import string
    from datetime import datetime, timedelta

    email = request.get("email")
    chat_id = request.get("chat_id")  # Telegram chat_id
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="此 Email 尚未註冊",
        )

    bind_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

    # Store with code as key, include chat_id
    BIND_CODES[bind_code] = {
        "chat_id": chat_id,  # Telegram chat_id
        "email": email,
        "expires": datetime.utcnow() + timedelta(minutes=10),
    }

    return {
        "bind_code": bind_code,
        "expires_in_minutes": 10,
        "message": "驗證碼已產生，請在 10 分鐘內完成驗證",
    }


@router.post("/unbind-telegram", status_code=status.HTTP_200_OK)
def unbind_telegram(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """解除 Telegram 綁定"""
    if not current_user.telegram_chat_id:
        return {"message": "未綁定 Telegram"}

    current_user.telegram_chat_id = None
    db.commit()
    return {"message": "已解除 Telegram 綁定"}
