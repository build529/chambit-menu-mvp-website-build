from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.services.menus import kst_today, public_entry, published_for


router = APIRouter()

templates = Jinja2Templates(directory="app/templates")


@router.get("/", response_class=HTMLResponse)
def public_menu_page(
    request: Request,
    line: str | None = Query(default=None),
    breakfast_line: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Public page behavior:
    - Breakfast and Lunch each have Left/Right line choices.
    - Dinner is one Shared-line meal.
    - Only published records are displayed.
    - Service date is calculated in KST.
    """
    service_date = kst_today()

    breakfast_left = published_for(
        db=db,
        service_date=service_date,
        meal_period="BREAKFAST",
        line_type="LEFT",
    )

    breakfast_right = published_for(
        db=db,
        service_date=service_date,
        meal_period="BREAKFAST",
        line_type="RIGHT",
    )

    lunch_left = published_for(
        db=db,
        service_date=service_date,
        meal_period="LUNCH",
        line_type="LEFT",
    )

    lunch_right = published_for(
        db=db,
        service_date=service_date,
        meal_period="LUNCH",
        line_type="RIGHT",
    )

    dinner_entry = published_for(
        db=db,
        service_date=service_date,
        meal_period="DINNER",
        line_type="SHARED",
    )

    requested_breakfast_line = (breakfast_line or "").upper()
    if requested_breakfast_line == "RIGHT" and breakfast_right:
        selected_breakfast = breakfast_right
    elif requested_breakfast_line == "LEFT" and breakfast_left:
        selected_breakfast = breakfast_left
    else:
        selected_breakfast = breakfast_left or breakfast_right

    requested_lunch_line = (line or "").upper()
    if requested_lunch_line == "RIGHT" and lunch_right:
        selected_lunch = lunch_right
    elif requested_lunch_line == "LEFT" and lunch_left:
        selected_lunch = lunch_left
    else:
        selected_lunch = lunch_left or lunch_right

    return templates.TemplateResponse(
        request=request,
        name="public_index.html",
        context={
            "display_date": service_date,
            "breakfast_entry": (
                public_entry(selected_breakfast)
                if selected_breakfast
                else None
            ),
            "breakfast_available_lines": {
                "left": breakfast_left is not None,
                "right": breakfast_right is not None,
            },
            "entry": public_entry(selected_lunch) if selected_lunch else None,
            "available_lines": {
                "left": lunch_left is not None,
                "right": lunch_right is not None,
            },
            "dinner_entry": (
                public_entry(dinner_entry)
                if dinner_entry
                else None
            ),
            "ga_measurement_id": settings.ga_measurement_id,
        },
    )
