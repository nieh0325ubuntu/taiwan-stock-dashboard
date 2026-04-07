# Taiwan Stock Dashboard 開發記錄

## 專案概述

台灣股市 Web 應用，支援即時股價查詢、技術分析圖表、投資組合管理與價格提醒功能。

## 技術棧

| 組件 | 技術 |
|------|------|
| 後端 | FastAPI + SQLAlchemy + SQLite |
| 前端 | React + Vite + TypeScript + Tailwind |
| 股票數據 | Yahoo Finance (yfinance) |
| 圖表 | lightweight-charts |
| 部署 | Docker Compose |

## 專案結構

```
taiwan-stock-dashboard/
├── backend/                    # FastAPI 後端
│   ├── app/
│   │   ├── api/v1/            # API 路由
│   │   │   ├── auth.py        # 認證 (登入/註冊)
│   │   │   ├── stocks.py     # 股票數據
│   │   │   ├── portfolio.py   # 投資組合
│   │   │   └── alerts.py     # 價格提醒
│   │   ├── services/          # 業務邏輯
│   │   │   └── stock.py       # yfinance 數據服務
│   │   ├── models/            # SQLAlchemy 模型
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── core/              # 配置
│   │   ├── database.py        # 資料庫連線
│   │   └── main.py            # FastAPI 入口
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── pages/             # 頁面元件
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── StockSearch.tsx
│   │   │   ├── StockDetail.tsx  # 含 K 線圖
│   │   │   ├── Portfolio.tsx
│   │   │   └── Alerts.tsx
│   │   ├── components/         # 共用元件
│   │   ├── services/          # API 服務
│   │   ├── store/             # 狀態管理 (Zustand)
│   │   └── types/             # TypeScript 類型
│   ├── package.json
│   └── Dockerfile
├── telegram-bot/               # Telegram Bot (待整合)
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── data/                      # SQLite 資料庫
├── docker-compose.yml
└── .env                       # 環境變數
```

## 開發歷程

### Phase 1: 專案初始化

1. 建立專案目錄結構
2. Docker Compose 配置後端與前端
3. 後端 FastAPI 框架搭建
4. 前端 React + Vite + Tailwind 搭建
5. SQLite 資料庫設定

### Phase 2: 用戶認證系統

1. SQLAlchemy User 模型建立
2. JWT 認證機制 (python-jose + passlib)
3. 登入/註冊 API (auth.py)
4. 前端 Login/Register 頁面
5. Zustand 狀態管理

### Phase 3: 股票數據 (重要)

**問題 1: TWSE API 封鎖**
- 嘗試使用 twstock 庫連線台灣證券交易所
- 伺服器回傳 307 重新導向 + 安全驗證頁面
- Docker 環境 IP 被封鎖

**解決方案: 改用 Yahoo Finance (yfinance)**
- 成功取得台灣股票即時報價
- 股票代碼格式: `2330.TW` (2330 為台積電)
- 即時價格、漲跌、成交量等數據

**問題 2: 浮點數精度**
- 價格顯示出現過多小數位 (如 -0.05000000000000071)
- 修復: 所有數值使用 `round(float(), 2)` 四捨五入至 2 位小數

### Phase 4: K 線圖 (重要)

**問題: Chart 不顯示**

經過多次除錯與修復:

1. **時間格式問題**
   - 嘗試: `h.date.split('-').join('')` → "20260327"
   - 最終: 直接使用 `h.date` (ISO 格式) lightweight-charts 支援

2. **React 渲染時機**
   - 問題: history 資料載入時，容器 ref 尚未綁定
   - 嘗試: useEffect、useLayoutEffect、requestAnimationFrame
   - 最終解法: 添加 `chartReady` 狀態，確保資料載入完成後再渲染圖表

3. **程式碼最終版本** (StockDetail.tsx):
```tsx
const [chartReady, setChartReady] = useState(false);

useEffect(() => {
  // 載入資料後延遲設定 chartReady
  setLoading(false);
  setTimeout(() => setChartReady(true), 100);
}, [code]);

useEffect(() => {
  if (!chartReady || !chartContainerRef.current || history.length === 0) {
    return;
  }
  // 建立圖表邏輯...
}, [chartReady, history]);
```

### Phase 5: 投資組合與提醒

1. Portfolio API + 前端頁面
2. Alerts API + 前端頁面
3. 為所有 input/select 標籤添加 id/name 屬性 (修復 TypeScript 警告)

### Phase 6: Telegram Bot

- 基礎程式碼已建立 (telegram-bot/)
- 功能: /start、/bind、/alerts、/help
- 待完成: 與後端整合、價格檢查排程

## 環境變數 (.env)

```env
# Backend
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Frontend
VITE_API_URL=http://localhost:8000
```

## 啟動方式

```bash
cd taiwan-stock-dashboard
docker compose up -d
```

- 前端: http://localhost:3000
- 後端 API: http://localhost:8000

## 已修復問題清單

| 問題 | 解決方案 |
|------|----------|
| TWSE API 封鎖 | 改用 Yahoo Finance (yfinance) |
| 價格浮點數精度過高 | 使用 `round()` 處理所有數值 |
| K 線圖不顯示 | 添加 `chartReady` 狀態控制渲染時機 |
| 表單欄位缺少 id/name | 為所有 input/select 添加屬性 |
| TypeScript 錯誤 | useRef 改用 `null` 初始值 |

## 待完成功能

1. **Telegram Bot 整合**
   - 價格檢查排程
   - Telegram 通知推播
2. **完整測試** - 所有頁面功能驗證
3. **MA 線顯示** - 在 K 線圖上疊加移動平均線
4. **行動版優化** - RWD 調整

## 相關筆記

- Yahoo Finance 代碼格式: `{股票代碼}.TW`
- 支援的股票列表定義於 `backend/app/services/stock.py` 的 `STOCK_NAMES`
- lightweight-charts 需要容器有明確尺寸才能正確渲染