import time
from datetime import datetime
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models


router = APIRouter()

# In-memory IP timestamp tracker: { "192.168.1.1": [timestamp1, timestamp2, ...] }
ip_request_history = {}
FIFTEEN_MINUTES_IN_SECONDS = 15 * 60  # 900 seconds
MAX_CODES_PER_WINDOW = 4

def get_client_ip(request: Request) -> str:
    """Extracts student IP address, handling proxies on Render/Cloudflare."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

@router.post("/api/claim-levant-coupon")
def claim_levant_coupon(request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    current_time = time.time()

    # --- LAYER 2: IP RATE LIMIT CHECK (Max 4 codes per 12 hours) ---
    if client_ip not in ip_request_history:
        ip_request_history[client_ip] = []

    # Filter out timestamps older than 12 hours
    ip_request_history[client_ip] = [
        ts for ts in ip_request_history[client_ip]
        if current_time - ts < FIFTEEN_MINUTES_IN_SECONDS
    ]

    if len(ip_request_history[client_ip]) >= MAX_CODES_PER_WINDOW:
        return {
            "success": False,
            "reason": "rate_limit_exceeded",
            "message": "Too many coupon requests from this network. Try switching off Wi-Fi to Mobile Data!"
        }

    # --- QUERY FIRST UNASSIGNED TEST CODE FROM SUPABASE ---
    coupon = db.query(models.LevantCoupon).filter(
        models.LevantCoupon.is_assigned == False
    ).first()

    if not coupon:
        return {
            "success": False,
            "reason": "out_of_stock",
            "message": "All test codes have been claimed!"
        }

    # Mark coupon as assigned in Supabase
    coupon.is_assigned = True
    coupon.assigned_at = datetime.utcnow()
    coupon.assigned_ip = client_ip
    
    db.commit()

    # Log request timestamp for IP rate limiting
    ip_request_history[client_ip].append(current_time)

    return {
        "success": True,
        "code": coupon.code
    }