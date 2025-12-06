# app/api/otp_router.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import os
from supabase import create_client, Client

router = APIRouter()

# -----------------------------
# Supabase Initialization
# -----------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None
    print("Warning: Supabase not configured")


# -----------------------------
# Pydantic Models
# -----------------------------
class OTPRequest(BaseModel):
    email: EmailStr
    userId: str


class VerifyOTPRequest(BaseModel):
    userId: str
    otp: str


# -----------------------------
# Send OTP Endpoint
# -----------------------------
@router.post("/send-otp")
async def send_otp(request: OTPRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        response = supabase.functions.invoke(
            "send-otp-email",
            body={"email": request.email, "userId": request.userId}
        )
        return {"status": "success", "data": response}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Send OTP error: {str(e)}")


# -----------------------------
# Verify OTP Endpoint
# -----------------------------
@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        response = supabase.functions.invoke(
            "verify-otp",
            body={"userId": request.userId, "otp": request.otp}
        )
        return {"status": "success", "data": response}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verify OTP error: {str(e)}")
