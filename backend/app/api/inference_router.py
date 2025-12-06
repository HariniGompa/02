# app/api/inference_router.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from app.ml.inference import predict_model

router = APIRouter()

# -----------------------------
# Pydantic Model for ML Input
# -----------------------------
class MLRequest(BaseModel):
    username: Optional[str] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    dependents: Optional[int] = None
    education: Optional[str] = None
    age: Optional[int] = None
    job_title: Optional[str] = None
    annual_salary: Optional[float] = None
    collateral_value: Optional[float] = None
    savings_balance: Optional[float] = None
    employment_type: Optional[str] = None
    years_of_employment: Optional[int] = None
    previous_balance_flag: Optional[bool] = None
    previous_loan_status: Optional[str] = None
    previous_loan_amount: Optional[float] = None
    total_emi_amount_per_month: Optional[float] = None
    loan_purpose: Optional[str] = None
    loan_amount: Optional[float] = None
    repayment_term_months: Optional[int] = None
    additional_income_sources: Optional[str] = None
    num_credit_cards: Optional[int] = None
    avg_credit_utilization_pct: Optional[float] = None
    late_payment_history: Optional[bool] = None
    wants_loan_insurance: Optional[bool] = None

# -----------------------------
# ML Prediction Endpoint
# -----------------------------
@router.post("/predict")
async def predict_loan_eligibility(payload: MLRequest):
    try:
        # Convert payload to dict
        features: Dict[str, Any] = payload.dict()

        # Call the existing predict_model() logic
        result = predict_model(features)

        # Return JSON response aligned with frontend expectations
        return {
            "eligible": result.get("approved", False),
            "probability": result.get("probability", 0.0),
            "decision": result.get("decision", "Pending"),
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")
