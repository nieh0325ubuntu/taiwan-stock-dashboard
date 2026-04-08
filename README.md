# Taiwan Stock Dashboard

台灣股市 Web 應用，支援即時股價、技術分析、投資組合管理與價格提醒。

## 功能特點

- **即時股價查詢** - 搜尋股票代碼，即時取得報價
- **技術分析** - K線圖、MA、RSI、KD 指標
- **投資組合** - 管理持股、計算損益
- **價格提醒** - 設定目標價格，透過 Telegram 通知
- **用戶系統** - 註冊/登入、JWT 認證

## 技術棧

| 組件 | 技術 |
|------|------|
| 後端 | FastAPI + SQLAlchemy + SQLite |
| 前端 | React + Vite + TypeScript + Tailwind |
| 股票數據 | Yahoo Finance (yfinance) |
| 圖表 | Lightweight Charts |
| Telegram Bot | python-telegram-bot |
| 部署 | Docker Compose |

## 快速開始

### 1. 環境準備

- Docker & Docker Compose

### 2. 配置文件

編輯 `.env`：

```env
SECRET_KEY=your-secret-key-change-in-production-min-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### 3. 啟動服務

```bash
cd taiwan-stock-dashboard
docker-compose up -d
```

### 4. 訪問應用

- 前端：http://localhost:3000
- 後端 API：http://localhost:8000

## 專案結構

```
taiwan-stock-dashboard/
├── backend/          # FastAPI 後端
├── frontend/         # React 前端
├── telegram-bot/     # Telegram Bot
├── docker-compose.yml
├── .env
└── data/             # SQLite 資料庫
```

## API 端點

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | /api/v1/auth/register | 註冊 |
| POST | /api/v1/auth/login | 登入 |
| GET | /api/v1/stocks/search | 搜尋股票 |
| GET | /api/v1/stocks/{code} | 股價資訊 |
| GET | /api/v1/stocks/{code}/history | 歷史資料 |
| GET | /api/v1/portfolio/ | 投資組合 |
| POST | /api/v1/portfolio/ | 新增持仓 |
| GET | /api/v1/alerts/ | 價格提醒 |
| POST | /api/v1/alerts/ | 新增提醒 |

## 開發

### 本地開發

```bash
# 後端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

## License

MITCI trigger Wed Apr  8 11:49:13 AM CST 2026
