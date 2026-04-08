<<<<<<< HEAD
"""
Taiwan Stock Dashboard - Telegram Bot
即時股價查詢、價格提醒通知機器人
"""

import os
from typing import Optional

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
    ContextTypes,
)
import httpx

# ============================================================================
# 設定
# ============================================================================
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

# 記憶體儲存
user_sessions: dict = {}


# ============================================================================
# API 呼叫
# ============================================================================
async def api_get(
    endpoint: str, params: dict = None, chat_id: str = None
) -> Optional[dict]:
    headers = {}
    if chat_id:
        headers["X-Telegram-Chat-ID"] = chat_id

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{BACKEND_URL}{endpoint}", params=params, headers=headers
            )
            if response.status_code == 200:
                return response.json()
            return None
    except Exception as e:
        print(f"API Error: {e}")
        return None


async def api_post(
    endpoint: str, data: dict = None, chat_id: str = None
) -> Optional[dict]:
    headers = {}
    if chat_id:
        headers["X-Telegram-Chat-ID"] = chat_id

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{BACKEND_URL}{endpoint}", json=data, headers=headers
            )
            if response.status_code in [200, 201]:
                return response.json()
            return None
    except Exception as e:
        print(f"API Error: {e}")
        return None


async def get_user_by_chat_id(chat_id: str) -> Optional[dict]:
    return await api_get("/api/v1/auth/me", chat_id=chat_id)


async def get_stock_info(code: str) -> Optional[dict]:
    return await api_get(f"/api/v1/stocks/{code}")


async def get_user_alerts(chat_id: str) -> Optional[list]:
    return await api_get("/api/v1/alerts/", chat_id=chat_id)


# ============================================================================
# 工具函數
# ============================================================================
def parse_stock_code(code: str) -> str:
    code = code.strip().upper()
    for suffix in [".TW", ".TWO", "TW", "TWO"]:
        if code.endswith(suffix):
            code = code[: -len(suffix)]
    return code


# ============================================================================
# 命令處理
# ============================================================================
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    user = await get_user_by_chat_id(chat_id)

    if user:
        text = (
            f"👋 歡迎回來，{user.get('full_name', '投資人')}！\n\n"
            "📊 台灣股市機器人 - 已綁定\n\n"
            "可用指令：\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "/stock <代碼> - 查詢股票現價\n"
            "/alerts - 查看價格提醒\n"
            "/search <關鍵字> - 搜尋股票\n"
            "/unbind - 解除綁定\n"
            "/help - 幫助\n"
            "━━━━━━━━━━━━━━━━━━━━"
        )
    else:
        text = (
            "👋 歡迎使用台灣股市機器人！\n\n"
            "📊 台灣股市查詢、即時價格提醒通知\n\n"
            "⚠️ 首次使用請先綁定帳戶：\n"
            "→ 輸入 /bind 開始綁定流程\n\n"
            "📌 常用指令：\n"
            "/stock <代碼> - 查詢股票現價\n"
            "/help - 查看完整幫助"
        )

    await update.message.reply_text(text)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "📌 台灣股市機器人 - 幫助\n\n"
        "━━━━━━━━━━ 指令說明 ━━━━━━━━━━\n\n"
        "🔗 帳戶管理\n"
        "/bind <email> - 綁定網站帳戶\n"
        "/unbind - 解除綁定\n\n"
        "📈 股票查詢\n"
        "/stock <代碼> - 查詢股票現價\n"
        "　例：/stock 2330 (台積電)\n"
        "　例：/stock 0050 (元大台灣50)\n\n"
        "/search <關鍵字> - 搜尋股票\n"
        "　例：/search 台積電\n\n"
        "🔔 價格提醒\n"
        "/alerts - 查看已設定的提醒\n"
        "/alertadd <代碼> <above|below> <價格>\n"
        "　例：/alertadd 2330 above 1100\n\n"
        "💡 提示\n"
        "・股票代碼可不帶 .TW 後綴"
    )
    await update.message.reply_text(text)


async def bind_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """綁定流程 - 產生驗證碼"""
    chat_id = str(update.effective_chat.id)

    user = await get_user_by_chat_id(chat_id)
    if user:
        await update.message.reply_text(
            f"✅ 已綁定帳戶：{user.get('email')}\n如需更換帳戶，請先使用 /unbind"
        )
        return

    if not context.args:
        await update.message.reply_text(
            "📧 請輸入您的帳戶 Email：\n"
            "（在網站註冊的 Email）\n\n"
            "例：/bind your@email.com"
        )
        return

    email = context.args[0]
    if "@" not in email:
        await update.message.reply_text("❌ Email 格式不正確")
        return

    result = await api_post(
        "/api/v1/auth/bind-telegram-create-code",
        data={"email": email, "chat_id": chat_id},
    )

    if not result:
        await update.message.reply_text("❌ 無法產生驗證碼，請稍後再試")
        return

    bind_code = result.get("bind_code")

    user_sessions[chat_id] = {
        "email": email,
        "bind_code": bind_code,
    }

    await update.message.reply_text(
        f"✅ 驗證碼已產生！\n\n"
        f"📋 您的驗證碼：\n"
        f"━━━━━━━━━━━━\n"
        f"   **{bind_code}**\n"
        f"━━━━━━━━━━━━\n\n"
        f"📝 請到網站完成以下步驟：\n"
        f"1. 登入網站\n"
        f"2. 點選「設定」\n"
        f"3. 在 Telegram 區塊輸入驗證碼\n\n"
        f"⏰ 驗證碼 10 分鐘內有效",
        parse_mode="Markdown",
    )


async def bind_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """處理綁定相關按鈕回調"""
    query = update.callback_query
    await query.answer()
    chat_id = str(query.message.chat_id)

    if query.data == "bind_copy_code":
        session = user_sessions.get(chat_id, {})
        if session.get("bind_code"):
            await query.edit_message_text(
                f"📋 驗證碼：**{session['bind_code']}**\n\n"
                "📝 請到網站設定頁面輸入此驗證碼",
                parse_mode="Markdown",
            )


async def unbind_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """解除綁定"""
    chat_id = str(update.effective_chat.id)

    result = await api_post("/api/v1/auth/unbind-telegram", chat_id=chat_id)

    if result:
        await update.message.reply_text("✅ 已解除 Telegram 綁定")
    else:
        await update.message.reply_text("ℹ️ 帳戶未綁定或已過期")


async def stock_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """查詢股票現價"""
    if not context.args:
        await update.message.reply_text("📈 請輸入股票代碼：\n例：/stock 2330")
        return

    code = parse_stock_code(context.args[0])
    msg = await update.message.reply_text(f"🔍 查詢 {code} 中...")

    info = await get_stock_info(code)

    if info and info.get("price", 0) > 0:
        price = info["price"]
        change = info.get("change", 0)
        change_percent = info.get("change_percent", 0)
        high = info.get("high", 0)
        low = info.get("low", 0)
        volume = info.get("volume", 0)
        name = info.get("name", f"股票{code}")

        emoji = "🔺" if change >= 0 else "🔻"
        sign = "+" if change >= 0 else ""

        text = (
            f"📊 **{name}** ({code})\n"
            f"━━━━━━━━━━━━━━━━\n"
            f"💰 現價：{price:.2f}\n"
            f"{emoji} 漲跌：{sign}{change:.2f} ({sign}{change_percent:.2f}%)\n"
            f"📈 最高：{high:.2f}\n"
            f"📉 最低：{low:.2f}\n"
            f"📊 成交量：{volume:,}\n"
            f"━━━━━━━━━━━━━━━━\n"
            f"🔔 設定提醒：/alertadd {code} above {price:.0f}"
        )
    else:
        text = f"❌ 無法取得 {code} 的資料"

    await msg.edit_text(text, parse_mode="Markdown")


async def search_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """搜尋股票"""
    if not context.args:
        await update.message.reply_text("🔍 請輸入搜尋關鍵字：\n例：/search 台積電")
        return

    keyword = " ".join(context.args)
    msg = await update.message.reply_text(f"🔍 搜尋「{keyword}」...")

    results = await api_get("/api/v1/stocks/search", params={"keyword": keyword})

    if results and results.get("results"):
        stocks = results["results"][:10]
        text = f"🔍 搜尋結果（共 {len(results['results'])} 筆）：\n\n"

        for i, stock in enumerate(stocks, 1):
            code = stock["code"]
            name = stock["name"]
            text += f"{i}. **{name}** ({code})\n"
            text += f"   📈 /stock {code}\n\n"

        await msg.edit_text(text, parse_mode="Markdown")
    else:
        await msg.edit_text(f"❌ 找不到「{keyword}」相關股票")


async def alerts_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """查看價格提醒"""
    chat_id = str(update.effective_chat.id)

    user = await get_user_by_chat_id(chat_id)
    if not user:
        await update.message.reply_text("⚠️ 請先綁定帳戶：\n→ /bind 您的@email.com")
        return

    alerts = await get_user_alerts(chat_id)

    if not alerts:
        await update.message.reply_text(
            "🔔 目前沒有設定任何價格提醒\n\n"
            "💡 設定新提醒：\n"
            "/alertadd <代碼> <above|below> <價格>"
        )
        return

    text = f"🔔 您的價格提醒（共 {len(alerts)} 筆）：\n\n"

    for alert in alerts:
        code = alert["stock_code"]
        condition = "↑ 高於" if alert["condition"] == "above" else "↓ 低於"
        target = alert["target_price"]
        status = "✅ 啟用" if alert.get("is_active", True) else "⏸ 已觸發"

        text += f"• **{code}** {condition} {target:.2f}\n"
        text += f"  狀態：{status}\n\n"

    await update.message.reply_text(text, parse_mode="Markdown")


async def alertadd_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """新增價格提醒"""
    chat_id = str(update.effective_chat.id)

    user = await get_user_by_chat_id(chat_id)
    if not user:
        await update.message.reply_text("⚠️ 請先綁定帳戶：\n→ /bind 您的@email.com")
        return

    if len(context.args) < 3:
        await update.message.reply_text(
            "📝 請輸入完整參數：\n"
            "/alertadd <代碼> <above|below> <價格>\n\n"
            "例：/alertadd 2330 above 1100\n"
            "例：/alertadd 2330 below 1000"
        )
        return

    code = parse_stock_code(context.args[0])
    condition = context.args[1].lower()
    try:
        target_price = float(context.args[2])
    except ValueError:
        await update.message.reply_text("❌ 價格必須是數字")
        return

    if condition not in ["above", "below"]:
        await update.message.reply_text("❌ 條件必須是 above 或 below")
        return

    result = await api_post(
        "/api/v1/alerts/",
        data={"stock_code": code, "condition": condition, "target_price": target_price},
        chat_id=chat_id,
    )

    if result:
        condition_text = "高於" if condition == "above" else "低於"
        await update.message.reply_text(
            f"✅ 價格提醒已設定！\n\n"
            f"📊 股票：{code}\n"
            f"🔔 條件：{condition_text} {target_price:.2f}"
        )
    else:
        await update.message.reply_text("❌ 設定失敗，請稍後再試")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """處理普通訊息"""
    await update.message.reply_text("🤖 不了解這個指令\n請使用 /help 查看可用指令")


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """錯誤處理"""
    print(f"Error: {context.error}")


# ============================================================================
# 主程式
# ============================================================================
def main():
    token = TELEGRAM_BOT_TOKEN

    if not token or token == "your-telegram-bot-token":
        print("=" * 50)
        print("❌ 錯誤：請設定 TELEGRAM_BOT_TOKEN")
        print("")
        print("設定方式：")
        print("1. 在 Telegram 找 @BotFather")
        print("2. 傳送 /newbot 建立新機器人")
        print("3. 取得 Token 並設定到 .env")
        print("4. 重新啟動")
        print("=" * 50)
=======
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import os
import httpx

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "歡迎使用台灣股市機器人！\n\n"
        "可用指令：\n"
        "/start - 開始\n"
        "/bind <email> - 綁定帳戶\n"
        "/alerts - 查看提醒\n"
        "/help - 幫助"
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📌 使用說明\n\n"
        "/start - 開始使用\n"
        "/bind <email> - 綁定網站帳戶 (需先在網站註冊)\n"
        "/alerts - 查看當前價格提醒\n"
        "/help - 顯示幫助信息\n\n"
        "💡 設定價格提醒：請到網站後台設定"
    )

async def bind_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("請提供 Email：/bind your@email.com")
        return

    email = context.args[0]
    chat_id = str(update.effective_chat.id)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BACKEND_URL}/api/v1/auth/bind-telegram",
                params={"chat_id": chat_id},
                headers={"Authorization": f"Bearer get_token_from_user"}
            )
            await update.message.reply_text(f"已嘗試綁定 {email}，請先在網站登入後再試")
    except Exception as e:
        await update.message.reply_text(f"綁定失敗：{str(e)}")

async def alerts_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    await update.message.reply_text("請先在網站綁定 Telegram 帳戶")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("未知指令，請使用 /help 查看可用指令")

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("錯誤：請設定 TELEGRAM_BOT_TOKEN 環境變數")
>>>>>>> origin/main
        return

    app = Application.builder().token(token).build()

    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("bind", bind_command))
<<<<<<< HEAD
    app.add_handler(CommandHandler("unbind", unbind_command))
    app.add_handler(CommandHandler("stock", stock_command))
    app.add_handler(CommandHandler("search", search_command))
    app.add_handler(CommandHandler("alerts", alerts_command))
    app.add_handler(CommandHandler("alertadd", alertadd_command))

    app.add_handler(CallbackQueryHandler(bind_callback_handler, pattern="bind_"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_error_handler(error_handler)

    print("=" * 50)
    print("✅ 台灣股市機器人啟動中...")
    print(f"📡 後端 URL: {BACKEND_URL}")
    print("=" * 50)

    app.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)


if __name__ == "__main__":
    main()
=======
    app.add_handler(CommandHandler("alerts", alerts_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("機器人啟動中...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
>>>>>>> origin/main
