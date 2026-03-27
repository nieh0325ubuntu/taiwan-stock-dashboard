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
        return

    app = Application.builder().token(token).build()

    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("bind", bind_command))
    app.add_handler(CommandHandler("alerts", alerts_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("機器人啟動中...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()