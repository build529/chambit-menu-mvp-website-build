import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Base class exported for app/models.py
Base = declarative_base()

# 1. Primary Database (Local SQLite / Main DB for menus, recipes, historical photos)
MAIN_DB_URL = os.getenv("DATABASE_URL", "sqlite:///./data/chambit.db")
if MAIN_DB_URL.startswith("postgres://"):
    MAIN_DB_URL = MAIN_DB_URL.replace("postgres://", "postgresql://", 1)

# Auto-create the directory if using local SQLite and the directory doesn't exist
if "sqlite" in MAIN_DB_URL:
    db_path = MAIN_DB_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

engine_main = create_engine(
    MAIN_DB_URL,
    connect_args={"check_same_thread": False} if "sqlite" in MAIN_DB_URL else {},
    pool_pre_ping=True if "postgresql" in MAIN_DB_URL else False
)

# Export 'engine' alias for app/main.py
engine = engine_main

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_main)


# 2. Coupon Database (Supabase PostgreSQL for coupons)
COUPON_DB_URL = os.getenv("COUPON_DATABASE_URL")
if COUPON_DB_URL and COUPON_DB_URL.startswith("postgres://"):
    COUPON_DB_URL = COUPON_DB_URL.replace("postgres://", "postgresql://", 1)

engine_supabase = create_engine(COUPON_DB_URL, pool_pre_ping=True) if COUPON_DB_URL else None
CouponSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_supabase) if engine_supabase else None


# Dependency for Menu & Main Website Routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Dependency for Coupon Routes
def get_coupon_db():
    if not CouponSessionLocal:
        raise RuntimeError("COUPON_DATABASE_URL is not configured in environment variables.")
    db = CouponSessionLocal()
    try:
        yield db
    finally:
        db.close()