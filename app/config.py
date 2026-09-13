import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


class Settings:
    secret_key = os.getenv("SECRET_KEY", "development-only-change-me")
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "change-me")

    database_url = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'data' / 'chambit.db'}",
    )

    upload_dir = Path(
        os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads"))
    )

    max_upload_bytes = int(os.getenv("MAX_UPLOAD_BYTES", "10485760"))
    ga_measurement_id = os.getenv("GA_MEASUREMENT_ID", "").strip()

    debug = os.getenv("DEBUG", "false").lower() == "true"
    allow_date_override = (
        os.getenv("ALLOW_DATE_OVERRIDE", "false").lower() == "true"
    )


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
