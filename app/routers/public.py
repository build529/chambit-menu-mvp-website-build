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
    db: Session = Depends(get_db),
):
    """
    Public page behavior:
    - Uses today's KST date.
    - Lunch has Left/Right lines.
    - Dinner is one Shared-line meal.
    - Only published records are exposed.
    """
    service_date = kst_today()

    left_entry = published_for(
        db=db,
        service_date=service_date,
        meal_period="LUNCH",
        line_type="LEFT",
    )

    right_entry = published_for(
        db=db,
        service_date=service_date,
        meal_period="LUNCH",
        line_type="RIGHT",
    )

    requested_line = (line or "").upper()

    if requested_line == "RIGHT" and right_entry:
        selected_entry = right_entry
    elif requested_line == "LEFT" and left_entry:
        selected_entry = left_entry
    else:
        # Default: Left Line first, otherwise the first available Lunch line.
        selected_entry = left_entry or right_entry

    dinner_entry = published_for(
        db=db,
        service_date=service_date,
        meal_period="DINNER",
        line_type="SHARED",
    )

    return templates.TemplateResponse(
        request=request,
        name="public_index.html",
        context={
            "display_date": service_date,
            "entry": public_entry(selected_entry) if selected_entry else None,
            "dinner_entry": public_entry(dinner_entry) if dinner_entry else None,
            "available_lines": {
                "left": left_entry is not None,
                "right": right_entry is not None,
            },
            "ga_measurement_id": settings.ga_measurement_id,
        },
    )
