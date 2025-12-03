from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..inference import predict_model

router = APIRouter(prefix="/ml", tags=["ML Model"])

# ----------- INPUT SCHEMA (matches your ML features) -----------
class MLRequest(BaseModel):
    username: str | None = None
    gender: str | None = None
    marital_status: str | None = None
    dependents: int | None = None
    education: str | None = None
    age: int | None = None
    job_title: str | None = None
    employment_type: str | None = None
    years_of_employment: int | None = None
    annual_salary: float | None = None
    additional_income: float | None = None
    savings_balance: float | None = None
    collateral_value: float | None = None
    previous_loan_status: str | None = None
    previous_loan_amount: float | None = None
    previous_loan_emi: float | None = None
    loan_purpose: str | None = None
    loan_amount: float | None = None
    repayment_term_months: int | None = None
    num_credit_cards: int | None = None
    credit_utilization: float | None = None
    late_payment_history: bool | None = None
    loan_insurance: bool | None = None


# -------------------- ML PREDICTION ENDPOINT --------------------
@router.post("/predict")
async def predict_loan_eligibility(payload: MLRequest):
    try:
        features = payload.dict()
        result = predict_model(features)

        return {
            "eligible": result["approved"],
            "probability": result["probability"],
            "decision": result["decision"],
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
