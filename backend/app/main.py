import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client

# -----------------------------
# Load environment variables
# -----------------------------
load_dotenv()

# -----------------------------
# Create FastAPI app
# -----------------------------
app = FastAPI(title="Loan Advisor Backend", version="1.0.0")

# -----------------------------
# CORS
# -----------------------------
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Supabase Initialization
# -----------------------------
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    supabase = None
else:
    supabase: Client = create_client(supabase_url, supabase_key)


# -----------------------------
# MODELS
# -----------------------------
class OTPRequest(BaseModel):
    email: str
    userId: str


class VerifyOTPRequest(BaseModel):
    userId: str
    otp: str


# -----------------------------
# ROOT
# -----------------------------
@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "Loan Advisor Backend",
        "message": "Backend is running on Render!"
    }


# -----------------------------
# HEALTH CHECK
# -----------------------------
@app.get("/health")
async def health_check():
    return {"status": "ok"}


# -----------------------------
# SEND OTP
# -----------------------------
@app.post("/api/send-otp")
async def send_otp(request: OTPRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        response = supabase.functions.invoke(
            "send-otp-email",
            body={"email": request.email, "userId": request.userId}
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# VERIFY OTP
# -----------------------------
@app.post("/api/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        response = supabase.functions.invoke(
            "verify-otp",
            body={"userId": request.userId, "otp": request.otp}
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ROUTERS (Correct place)
# -----------------------------
from app.extract import router as extract_router
from ML_services.routes.inference_router import router as inference_router

app.include_router(extract_router, prefix="/api", tags=["Extraction"])
app.include_router(inference_router, prefix="/api", tags=["ML"])


# -----------------------------
# START SERVER
# -----------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
