import random
import requests

from app.config import settings

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
REQUEST_TIMEOUT_SECONDS = 20


def generate_otp() -> str:
    """Generates a random 6-digit numeric code as a string (zero-padded)."""
    return str(random.randint(0, 999999)).zfill(OTP_LENGTH)


def send_verification_email(to_email: str, otp_code: str, user_name: str) -> None:
    """
    Sends a verification OTP email via Brevo's transactional email API.

    Previously used raw Gmail SMTP (smtplib), which failed on Render in two
    stages: first with "[Errno 101] Network is unreachable" (Render has no
    outbound IPv6 route, and smtp.gmail.com was resolving to an IPv6 address
    first), and after forcing IPv4, with a connection timeout instead -
    consistent with Render's free tier blocking/dropping outbound SMTP ports
    (587/465) entirely, a common anti-spam restriction on free hosting tiers.
    Brevo's API is a plain HTTPS POST (port 443), which sidesteps the whole
    problem - it's not a special SMTP port, so nothing blocks it.

    Raises an exception on failure - the caller decides how to handle it
    (e.g. still create the account but surface a clear error, since a
    failed send shouldn't silently pretend it worked).
    """
    if not settings.BREVO_API_KEY or not settings.BREVO_FROM_EMAIL:
        raise RuntimeError(
            "Email sending is not configured. Set BREVO_API_KEY and "
            "BREVO_FROM_EMAIL in the backend .env file."
        )

    subject = "Verify your StudyVault AI account"
    body = f"""Hi {user_name},

Your StudyVault AI verification code is:

    {otp_code}

This code expires in {OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore this email.

- StudyVault AI
"""

    payload = {
        "sender": {"name": "StudyVault AI", "email": settings.BREVO_FROM_EMAIL},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": settings.BREVO_API_KEY,
    }

    response = requests.post(
        BREVO_API_URL,
        json=payload,
        headers=headers,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )

    if response.status_code >= 400:
        raise RuntimeError(
            f"Brevo API returned {response.status_code}: {response.text}"
        )