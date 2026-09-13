from datetime import datetime, timezone

from sqlalchemy import Date, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


MEAL_PERIODS = ("BREAKFAST", "LUNCH", "DINNER")
LINE_TYPES = ("LEFT", "RIGHT", "SHARED")
IMAGE_SOURCES = ("AI_GENERATED", "REAL", "STUDENT_UPLOADED")
STATUSES = ("DRAFT", "PUBLISHED", "ARCHIVED")


class MenuEntry(Base):
    __tablename__ = "menu_entries"

    __table_args__ = (
        UniqueConstraint(
            "service_date",
            "meal_period",
            "line_type",
            name="uq_menu_date_meal_line",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    service_date: Mapped[datetime.date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    meal_period: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    line_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    menu_title: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    description_raw: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # JSON is stored as text for SQLite MVP portability.
    menu_items_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    image_path_or_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    image_source: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="DRAFT",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    notes_internal: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
