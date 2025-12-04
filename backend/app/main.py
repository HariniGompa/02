# app/main.py
import os
from fastapi import FastAPI
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware

# -----------------------------
# Load environment variables
# -----------------------------
load_dotenv()

# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI(
    title="Loan Advisor Backend",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# -----------------------------
# CORS Middleware
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
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None
    print("Warning: Supabase not configured")

# -----------------------------
# Import Routers
# -----------------------------
from app.api.inference_router import router as inference_router
from app.api.extract_router import router as extract_router
from app.api.otp_router import router as otp_router

# -----------------------------
# Include Routers
# -----------------------------
app.include_router(inference_router, prefix="/api/inference", tags=["ML Model"])
app.include_router(extract_router, prefix="/api/extract", tags=["Document Extraction"])
app.include_router(otp_router, prefix="/api", tags=["OTP Verification"])

# -----------------------------
# Root & Health Check
# -----------------------------
@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "Loan Advisor Backend",
        "message": "Backend is running on Render!"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# -----------------------------
# Uvicorn Entry Point
# -----------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
