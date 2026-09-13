from app.config import settings
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

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
    Public MVP page:
    - Uses today's calendar date in Korea Standard Time.
    - Shows Lunch only.
    - Defaults to Left Line when it is published.
    - Never exposes drafts or internal fields.
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
        # Required default: Left Line first, otherwise first available line.
        selected_entry = left_entry or right_entry


    return templates.TemplateResponse(
        request=request,
        name="public_index.html",
        context={
            "display_date": service_date,
            "entry": (
                public_entry(selected_entry)
                if selected_entry
                else None
            ),
            "available_lines": {
                "left": left_entry is not None,
                "right": right_entry is not None,
            },
            "ga_measurement_id": settings.ga_measurement_id,

        },
    )
