"""
Alert Scheduler - 定時檢查價格提醒並發送 Telegram 通知
只在台股盤中時段執行（9:00 - 13:30 台灣時間）
"""

import os
import logging
from datetime import datetime, time
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TELEGRAM_API_URL = "https://api.telegram.org"
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")


def is_market_open() -> bool:
    """
    檢查是否為盤中時段
    台股交易時間：09:00 - 13:30（台灣時間 UTC+8）
    """
    import pytz

    taiwan = pytz.timezone("Asia/Taipei")
    now = datetime.now(taiwan)

    if now.weekday() >= 5:
        return False

    market_open = time(9, 0)
    market_close = time(13, 30)
    current_time = now.time()

    return market_open <= current_time <= market_close


def send_telegram_message(chat_id: str, text: str) -> bool:
    """發送 Telegram 訊息"""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set")
        return False

    url = f"{TELEGRAM_API_URL}/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        response = httpx.post(
            url,
            json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
            timeout=10,
        )
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {e}")
        return False


def check_and_trigger_alerts():
    """檢查所有提醒並觸發條件符合的"""
    import pytz

    taiwan = pytz.timezone("Asia/Taipei")
    now = datetime.now(taiwan)

    if not is_market_open():
        logger.info(f"🔕 [{now.strftime('%H:%M')}] 非盤中時段，跳過檢查")
        return

    logger.info(f"🔔 [{now.strftime('%H:%M')}] 盤中時段，開始檢查提醒...")

    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(f"{BACKEND_URL}/api/v1/alerts/pending")
            if response.status_code != 200:
                logger.error(f"Failed to get pending alerts: {response.status_code}")
                return

            alerts = response.json()

        if not alerts:
            logger.info("目前沒有待檢查的提醒")
            return

        triggered_count = 0
        for alert in alerts:
            chat_id = alert.get("telegram_chat_id")
            if not chat_id:
                continue

            stock_code = alert["stock_code"]
            condition = alert["condition"]
            target_price = alert["target_price"]
            current_price = alert.get("current_price", 0)
            alert_id = alert["id"]

            if current_price <= 0:
                continue

            should_trigger = False
            if condition == "above" and current_price >= target_price:
                should_trigger = True
            elif condition == "below" and current_price <= target_price:
                should_trigger = True

            if should_trigger:
                condition_text = "已突破 📈" if condition == "above" else "已跌破 📉"

                message = (
                    f"🔔 *價格提醒*\n\n"
                    f"📊 **{stock_code}** {alert.get('name', stock_code)}\n"
                    f"━━━━━━━━━━━━━━━━\n"
                    f"💰 現價：{current_price:.2f}\n"
                    f"🎯 目標：{condition_text.replace('已', '')} {target_price:.2f}\n"
                    f"📈 最高：{alert.get('high', 0):.2f}\n"
                    f"📉 最低：{alert.get('low', 0):.2f}\n"
                    f"📊 成交量：{alert.get('volume', 0):,}\n"
                    f"━━━━━━━━━━━━━━━━\n"
                    f"⏰ 時間：{alert.get('updated', '')[:16]}"
                )

                if send_telegram_message(chat_id, message):
                    client.patch(
                        f"{BACKEND_URL}/api/v1/alerts/{alert_id}/mark-triggered"
                    )
                    triggered_count += 1
                    logger.info(
                        f"Alert {alert_id} ({stock_code}) triggered and notified"
                    )

        if triggered_count > 0:
            logger.info(f"觸發了 {triggered_count} 個提醒")
        else:
            logger.info("檢查完成，無提醒觸發")

    except Exception as e:
        logger.error(f"Error checking alerts: {e}")


def start_scheduler():
    """啟動排程器"""
    scheduler = BackgroundScheduler(timezone="Asia/Taipei")

    scheduler.add_job(
        check_and_trigger_alerts,
        trigger=IntervalTrigger(minutes=5),
        id="check_alerts",
        name="Check stock price alerts",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("✅ Alert scheduler started")
    logger.info("📅 檢查時段：週一至週五 09:00 - 13:30（台灣時間）")
    logger.info("⏰ 檢查頻率：每 5 分鐘")

    return scheduler
