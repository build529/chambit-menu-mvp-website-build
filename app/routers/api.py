from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.menus import (
    kst_today,
    public_entry,
    published_for,
    validate_combination,
)


router = APIRouter(
    prefix="/api/v1",
    tags=["public-api"],
)


@router.get("/menus")
def get_menu(
    date_value: date = Query(alias="date"),
    meal_period: str = "lunch",
    line: str = "left",
    db: Session = Depends(get_db),
):
    """
    Return one published menu record for an explicit date/meal/line.
    Example:
    /api/v1/menus?date=2026-09-14&meal_period=lunch&line=left
    """
    meal = meal_period.upper()
    line_type = line.upper()

    validate_combination(meal, line_type)

    entry = published_for(
        db=db,
        service_date=date_value,
        meal_period=meal,
        line_type=line_type,
    )

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="No published menu is available for this selection.",
        )

    return public_entry(entry)


@router.get("/menus/today")
def get_today_menu(
    meal_period: str = "lunch",
    line: str = "left",
    db: Session = Depends(get_db),
):
    """
    Return one published menu record using today's KST calendar date.
    """
    return get_menu(
        date_value=kst_today(),
        meal_period=meal_period,
        line=line,
        db=db,
    )
