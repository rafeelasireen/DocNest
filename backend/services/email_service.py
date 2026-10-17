import logging
import smtplib
from email.mime.text import MIMEText

from config import settings

logger = logging.getLogger(__name__)


def send_verification_email(email: str, token: str) -> None:
    link = f"{settings.frontend_url}/verify?token={token}"

    if not settings.smtp_host:
        logger.info("DEV EMAIL — Verification link for %s: %s", email, link)
        return

    msg = MIMEText(f"Click to verify your DocNest account: {link}")
    msg["Subject"] = "Verify your DocNest account"
    msg["From"] = settings.smtp_user
    msg["To"] = email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_pass)
        server.send_message(msg)
