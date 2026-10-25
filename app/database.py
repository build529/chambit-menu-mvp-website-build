import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base

Base = declarative_base()

# 1. Primary Database (Local SQLite for menus, recipes, historical photos)
MAIN_DB_URL = os.getenv("DATABASE_URL", "sqlite:///./data/chambit.db")

engine_main = create_engine(
    MAIN_DB_URL,
    connect_args={"check_same_thread": False} if "sqlite" in MAIN_DB_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_main)

# 2. Coupon Database (Supabase PostgreSQL for coupons)
COUPON_DB_URL = os.getenv("COUPON_DATABASE_URL")

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