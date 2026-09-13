import random
import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
SMTP_TIMEOUT_SECONDS = 20


def generate_otp() -> str:
    """Generates a random 6-digit numeric code as a string (zero-padded)."""
    return str(random.randint(0, 999999)).zfill(OTP_LENGTH)


class _SMTP_IPv4(smtplib.SMTP):
    """
    smtplib.SMTP, but forced to connect over IPv4.

    Some hosts (Render's free tier among them) have no outbound IPv6 route.
    smtplib's default connection logic uses socket.create_connection(),
    which tries whatever address getaddrinfo() returns first - if that's an
    IPv6 address on a host with no IPv6 route, the connection fails
    immediately with "[Errno 101] Network is unreachable", before ever
    reaching Gmail's servers.

    Only the low-level socket connection is forced to IPv4 here - self._host
    (used for the STARTTLS certificate hostname check) is left untouched as
    "smtp.gmail.com", so TLS certificate validation still works correctly.
    """

    def _get_socket(self, host, port, timeout):
        if self.debuglevel > 0:
            self._print_debug("connect:", (host, port))
        addr_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        _, _, _, _, sockaddr = addr_info[0]
        return socket.create_connection(sockaddr, timeout)


def send_verification_email(to_email: str, otp_code: str, user_name: str) -> None:
    """
    Sends a verification OTP email via Gmail SMTP.
    Raises an exception on failure - the caller decides how to handle it
    (e.g. still create the account but surface a clear error, since a
    failed send shouldn't silently pretend it worked).
    """
    if not settings.GMAIL_ADDRESS or not settings.GMAIL_APP_PASSWORD:
        raise RuntimeError(
            "Email sending is not configured. Set GMAIL_ADDRESS and "
            "GMAIL_APP_PASSWORD in the backend .env file."
        )

    subject = "Verify your StudyVault AI account"
    body = f"""Hi {user_name},

Your StudyVault AI verification code is:

    {otp_code}

This code expires in {OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore this email.

- StudyVault AI
"""

    message = MIMEMultipart()
    message["From"] = settings.GMAIL_ADDRESS
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

    with _SMTP_IPv4("smtp.gmail.com", 587, timeout=SMTP_TIMEOUT_SECONDS) as server:
        server.starttls()
        server.login(settings.GMAIL_ADDRESS, settings.GMAIL_APP_PASSWORD)
        server.sendmail(settings.GMAIL_ADDRESS, to_email, message.as_string())