import secrets
from datetime import date

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import MenuEntry

import json
from datetime import datetime, timezone

from fastapi import File, UploadFile
from sqlalchemy.exc import IntegrityError

from app.services.menus import normalize_items, validate_combination
from app.services.storage import delete_local_image, save_image


router = APIRouter(prefix="/admin", tags=["admin"])

templates = Jinja2Templates(directory="app/templates")


def get_csrf_token(request: Request) -> str:
    """Create and retain one CSRF token for this signed browser session."""
    return request.session.setdefault(
        "csrf_token",
        secrets.token_urlsafe(32),
    )


def require_admin(request: Request) -> str:
    """Return the authenticated administrator or reject unauthenticated access."""
    admin_username = request.session.get("admin_username")

    if not admin_username:
        raise HTTPException(
            status_code=401,
            detail="Admin sign-in required.",
        )

    return admin_username


def verify_csrf(request: Request, csrf_token: str) -> None:
    expected_token = request.session.get("csrf_token", "")

    if not csrf_token or not secrets.compare_digest(
        csrf_token,
        expected_token,
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid form token.",
        )


def redirect(url: str) -> RedirectResponse:
    return RedirectResponse(url=url, status_code=303)


@router.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="admin_login.html",
        context={
            "error": None,
            "csrf_token": get_csrf_token(request),
        },
    )


@router.post("/login", response_class=HTMLResponse)
def login(
    request: Request,
    username: str = Form(),
    password: str = Form(),
    csrf_token: str = Form(),
):
    verify_csrf(request, csrf_token)

    valid_username = secrets.compare_digest(
        username,
        settings.admin_username,
    )
    valid_password = secrets.compare_digest(
        password,
        settings.admin_password,
    )

    if not (valid_username and valid_password):
        return templates.TemplateResponse(
            request=request,
            name="admin_login.html",
            context={
                "error": "Invalid username or password.",
                "csrf_token": get_csrf_token(request),
            },
            status_code=401,
        )

    request.session["admin_username"] = username

    return redirect("/admin")


@router.post("/logout")
def logout(
    request: Request,
    csrf_token: str = Form(),
):
    verify_csrf(request, csrf_token)
    request.session.clear()

    return redirect("/admin/login")


@router.get("", response_class=HTMLResponse)
def admin_dashboard(
    request: Request,
    service_date: date | None = None,
    db: Session = Depends(get_db),
):
    require_admin(request)

    statement = select(MenuEntry).order_by(
        MenuEntry.service_date.desc(),
        MenuEntry.meal_period,
        MenuEntry.line_type,
    )

    if service_date:
        statement = statement.where(
            MenuEntry.service_date == service_date
        )

    entries = db.scalars(statement).all()

    return templates.TemplateResponse(
        request=request,
        name="admin_dashboard.html",
        context={
            "entries": entries,
            "filter_date": service_date,
            "csrf_token": get_csrf_token(request),
        },
    )


@router.get("/new", response_class=HTMLResponse)
def new_menu_form(request: Request):
    require_admin(request)

    return templates.TemplateResponse(
        request=request,
        name="admin_edit_menu.html",
        context={
            "csrf_token": get_csrf_token(request),
        },
    )


@router.post("/save")
def create_menu_entry(
    request: Request,
    service_date: date = Form(),
    meal_period: str = Form(),
    line_type: str = Form(),
    image_source: str = Form(),
    menu_title: str = Form(""),
    description_raw: str = Form(""),
    menu_items: str = Form(""),
    status: str = Form(),
    notes_internal: str = Form(""),
    csrf_token: str = Form(),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    admin_username = require_admin(request)
    verify_csrf(request, csrf_token)

    meal_period = meal_period.upper()
    line_type = line_type.upper()
    image_source = image_source.upper()
    status = status.upper()

    validate_combination(meal_period, line_type)

    valid_sources = {"AI_GENERATED", "REAL", "STUDENT_UPLOADED"}
    valid_statuses = {"DRAFT", "PUBLISHED", "ARCHIVED"}

    if image_source not in valid_sources:
        raise HTTPException(
            status_code=422,
            detail="Invalid image source.",
        )

    if status not in valid_statuses:
        raise HTTPException(
            status_code=422,
            detail="Invalid publication status.",
        )

    normalized_items = normalize_items(menu_items)
    image_path = save_image(image)

    if status == "PUBLISHED" and not normalized_items:
        raise HTTPException(
            status_code=422,
            detail="Published entries require at least one menu item.",
        )

    if status == "PUBLISHED" and not image_path:
        raise HTTPException(
            status_code=422,
            detail="Published entries require an image.",
        )

    entry = MenuEntry(
        service_date=service_date,
        meal_period=meal_period,
        line_type=line_type,
        menu_title=menu_title.strip() or None,
        description_raw=description_raw.strip() or None,
        menu_items_json=json.dumps(normalized_items),
        image_path_or_url=image_path,
        image_source=image_source,
        status=status,
        published_at=(
            datetime.now(timezone.utc)
            if status == "PUBLISHED"
            else None
        ),
        created_by=admin_username,
        notes_internal=notes_internal.strip() or None,
    )

    db.add(entry)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail=(
                "A menu record already exists for this "
                "date, meal period, and line type."
            ),
        ) from error

    return redirect("/admin")


@router.get("/{entry_id}/edit", response_class=HTMLResponse)
def edit_menu_form(
    entry_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    require_admin(request)

    entry = db.get(MenuEntry, entry_id)

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="Menu entry not found.",
        )

    return templates.TemplateResponse(
        request=request,
        name="admin_edit_menu.html",
        context={
            "entry": entry,
            "items_text": "\n".join(
                json.loads(entry.menu_items_json)
            ),
            "csrf_token": get_csrf_token(request),
        },
    )


@router.post("/{entry_id}/save")
def update_menu_entry(
    entry_id: int,
    request: Request,
    service_date: date = Form(),
    meal_period: str = Form(),
    line_type: str = Form(),
    image_source: str = Form(),
    menu_title: str = Form(""),
    description_raw: str = Form(""),
    menu_items: str = Form(""),
    status: str = Form(),
    notes_internal: str = Form(""),
    csrf_token: str = Form(),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    require_admin(request)
    verify_csrf(request, csrf_token)

    entry = db.get(MenuEntry, entry_id)

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="Menu entry not found.",
        )

    meal_period = meal_period.upper()
    line_type = line_type.upper()
    image_source = image_source.upper()
    status = status.upper()

    validate_combination(meal_period, line_type)

    valid_sources = {"AI_GENERATED", "REAL", "STUDENT_UPLOADED"}
    valid_statuses = {"DRAFT", "PUBLISHED", "ARCHIVED"}

    if image_source not in valid_sources:
        raise HTTPException(
            status_code=422,
            detail="Invalid image source.",
        )

    if status not in valid_statuses:
        raise HTTPException(
            status_code=422,
            detail="Invalid publication status.",
        )

    normalized_items = normalize_items(menu_items)

    old_image_path = entry.image_path_or_url
    new_image_path = save_image(image)

    final_image_path = new_image_path or old_image_path

    if status == "PUBLISHED" and not normalized_items:
        if new_image_path:
            delete_local_image(new_image_path)

        raise HTTPException(
            status_code=422,
            detail="Published entries require at least one menu item.",
        )

    if status == "PUBLISHED" and not final_image_path:
        raise HTTPException(
            status_code=422,
            detail="Published entries require an image.",
        )

    entry.service_date = service_date
    entry.meal_period = meal_period
    entry.line_type = line_type
    entry.menu_title = menu_title.strip() or None
    entry.description_raw = description_raw.strip() or None
    entry.menu_items_json = json.dumps(normalized_items)
    entry.image_path_or_url = final_image_path
    entry.image_source = image_source
    entry.status = status
    entry.notes_internal = notes_internal.strip() or None

    if status == "PUBLISHED" and entry.published_at is None:
        entry.published_at = datetime.now(timezone.utc)

    if status != "PUBLISHED":
        entry.published_at = None

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()

        if new_image_path:
            delete_local_image(new_image_path)

        raise HTTPException(
            status_code=422,
            detail=(
                "A menu record already exists for this "
                "date, meal period, and line type."
            ),
        ) from error

    if new_image_path and old_image_path != new_image_path:
        delete_local_image(old_image_path)

    return redirect("/admin")


@router.post("/{entry_id}/delete")
def delete_menu_entry(
    entry_id: int,
    request: Request,
    csrf_token: str = Form(),
    db: Session = Depends(get_db),
):
    require_admin(request)
    verify_csrf(request, csrf_token)

    entry = db.get(MenuEntry, entry_id)

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="Menu entry not found.",
        )

    image_path = entry.image_path_or_url

    db.delete(entry)
    db.commit()

    delete_local_image(image_path)

    return redirect("/admin")