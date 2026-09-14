import json
from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import MenuEntry


KST = ZoneInfo("Asia/Seoul")


def kst_today() -> date:
    """Return today's calendar date in Korea Standard Time."""
    return datetime.now(KST).date()


def normalize_items(raw: str) -> list[str]:
    """
    Convert one-item-per-line input into a clean ordered menu list.
    Empty lines and simple leading bullets/dashes are removed.
    """
    return [
        line.strip().lstrip("•-").strip()
        for line in raw.splitlines()
        if line.strip().lstrip("•-").strip()
    ]


def validate_combination(meal_period: str, line_type: str) -> None:
    """
    Enforce the MVP meal/line rules:
    - Breakfast and Lunch: Left or Right only
    - Dinner: Shared only
    """
    meal_period = meal_period.upper()
    line_type = line_type.upper()

    valid_meals = {"BREAKFAST", "LUNCH", "DINNER"}
    valid_lines = {"LEFT", "RIGHT", "SHARED"}

    if meal_period not in valid_meals or line_type not in valid_lines:
        raise HTTPException(
            status_code=422,
            detail="Invalid meal period or line type.",
        )

    if meal_period in {"BREAKFAST", "LUNCH"} and line_type not in {"LEFT", "RIGHT"}:
        raise HTTPException(
            status_code=422,
            detail="Breakfast and Lunch require Left or Right Line.",
        )

    if meal_period == "DINNER" and line_type != "SHARED":
        raise HTTPException(
            status_code=422,
            detail="Dinner requires Shared line.",
        )


def published_for(
    db: Session,
    service_date: date,
    meal_period: str,
    line_type: str,
) -> MenuEntry | None:
    """Fetch exactly one matching published menu record, if available."""
    statement = select(MenuEntry).where(
        MenuEntry.service_date == service_date,
        MenuEntry.meal_period == meal_period.upper(),
        MenuEntry.line_type == line_type.upper(),
        MenuEntry.status == "PUBLISHED",
    )

    return db.scalar(statement)


def public_entry(entry: MenuEntry) -> dict:
    """
    Return only fields safe for the public site/API.
    Internal notes and raw administrative data are intentionally excluded.
    """
    return {
        "id": entry.id,
        "service_date": entry.service_date.isoformat(),
        "meal_period": entry.meal_period.lower(),
        "line_type": entry.line_type.lower(),
        "title": f"{entry.meal_period.title()} · {entry.line_type.title()} Line",
        "message": entry.menu_title,
        "menu_items": json.loads(entry.menu_items_json),
        "image_url": entry.image_path_or_url,
        "image_source": entry.image_source.lower(),
        "updated_at": entry.updated_at.isoformat(),
    }
