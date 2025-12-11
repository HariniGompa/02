import io
import uuid
import os
from typing import Optional, Dict
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import tempfile

# -------------------- Setup --------------------
REPORT_DIR = os.path.join(tempfile.gettempdir(), 'reports')
os.makedirs(REPORT_DIR, exist_ok=True)

app = FastAPI(title="Loan Eligibility Mock Backend")

# Allow all origins (for demo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Pydantic Models --------------------
class ManualForm(BaseModel):
    username: Optional[str] = ""
    gender: Optional[str] = ""
    marital_status: Optional[str] = ""
    dependents: Optional[int] = 0
    education: Optional[str] = ""
    age: Optional[int] = 0
    job_title: Optional[str] = ""
    annual_salary: Optional[float] = 0.0
    collateral_value: Optional[float] = 0.0
    savings_balance: Optional[float] = 0.0
    employment_type: Optional[str] = ""
    years_of_employment: Optional[float] = 0.0
    previous_balance_flag: Optional[bool] = False
    previous_loan_status: Optional[str] = ""
    previous_loan_amount: Optional[float] = 0.0
    total_emi_amount_per_month: Optional[float] = 0.0
    loan_purpose: Optional[str] = ""
    loan_amount: Optional[float] = 0.0
    repayment_term_months: Optional[int] = 0
    additional_income_sources: Optional[str] = ""
    num_credit_cards: Optional[int] = 0
    avg_credit_utilization_pct: Optional[float] = 0.0
    late_payment_history: Optional[bool] = False
    wants_loan_insurance: Optional[bool] = False

# -------------------- Helper Functions --------------------
def compute_mock_probability(payload: ManualForm):
    # Same scoring logic as before
    salary = max(payload.annual_salary or 0.0, 0.0)
    emi = max(payload.total_emi_amount_per_month or 0.0, 0.0)
    monthly_income = salary / 12.0 if salary > 0 else 0.0
    utilization = min(max(payload.avg_credit_utilization_pct or 0.0, 0.0), 100.0)
    savings = max(payload.savings_balance or 0.0, 0.0)
    collateral = max(payload.collateral_value or 0.0, 0.0)
    years_worked = max(payload.years_of_employment or 0.0, 0.0)
    previous_flag = bool(payload.previous_balance_flag)
    late_history = bool(payload.late_payment_history)
    prev_status = (payload.previous_loan_status or "").lower()
    loan_amount = max(payload.loan_amount or 0.0, 0.0)

    score = 0.5

    if monthly_income > 0:
        if monthly_income > 50000:
            score += 0.2
        elif monthly_income > 30000:
            score += 0.12
        elif monthly_income > 15000:
            score += 0.06
        else:
            score -= 0.05

    if monthly_income > 0:
        emi_ratio = emi / (monthly_income + 1e-6)
        if emi_ratio < 0.2:
            score += 0.1
        elif emi_ratio < 0.4:
            score += 0.02
        elif emi_ratio < 0.6:
            score -= 0.04
        else:
            score -= 0.12

    if savings > 50000:
        score += 0.06
    if collateral > 0:
        score += min(0.08, collateral / (loan_amount + 1e-6) * 0.05)

    if utilization < 30:
        score += 0.06
    elif utilization < 60:
        score += 0.0
    else:
        score -= 0.07

    if years_worked >= 3:
        score += 0.05
    elif years_worked < 1:
        score -= 0.03

    if prev_status in ["default", "charged off", "rejected"]:
        score -= 0.18
    elif prev_status in ["paid", "closed", "settled"]:
        score += 0.04
    if previous_flag:
        score -= 0.05

    if late_history:
        score -= 0.1

    if payload.num_credit_cards and payload.num_credit_cards >= 4:
        score -= 0.03

    if salary > 0:
        ratio = loan_amount / (salary + 1e-6)
        if ratio > 2.5:
            score -= 0.08
        elif ratio < 0.5:
            score += 0.03

    if payload.wants_loan_insurance:
        score += 0.02

    return max(0.0, min(1.0, score))

def reasons_for_ineligibility(payload: ManualForm, prob: float):
    reasons = []
    salary = payload.annual_salary or 0.0
    monthly_income = salary / 12.0 if salary else 0.0
    emi = payload.total_emi_amount_per_month or 0.0
    utilization = payload.avg_credit_utilization_pct or 0.0

    if monthly_income < 15000:
        reasons.append("Monthly income is low relative to typical loan requirements.")
    if salary > 0 and (payload.loan_amount or 0.0) / salary > 2.5:
        reasons.append("Requested loan amount is high relative to annual salary.")
    if monthly_income > 0 and (emi / (monthly_income + 1e-6)) > 0.5:
        reasons.append("Existing EMIs exceed 50% of monthly income.")
    if utilization > 60:
        reasons.append("High credit utilization — reduce usage on credit cards.")
    if payload.late_payment_history:
        reasons.append("History of late payments detected.")
    if payload.previous_balance_flag:
        reasons.append("Outstanding previous loan balance flagged.")
    if payload.num_credit_cards and payload.num_credit_cards >= 6:
        reasons.append("Too many active credit cards.")
    if not reasons and prob < 0.5:
        reasons.append("Availability of credit and stability of income need improvement.")
    return reasons

def create_chart_image(payload: ManualForm, prob: float, out_path: str):
    labels = ["Income", "EMI Burden", "Savings", "Collateral", "Credit Util"]
    salary = payload.annual_salary or 0.0
    monthly_income = salary / 12.0 if salary else 0.0
    income_score = min(1.0, monthly_income / 50000.0)
    emi_score = max(0.0, 1.0 - min(1.0, (payload.total_emi_amount_per_month or 0.0) / (monthly_income + 1e-6)))
    savings_score = min(1.0, (payload.savings_balance or 0.0) / 200000.0)
    collateral_score = min(1.0, (payload.collateral_value or 0.0) / (payload.loan_amount + 1e-6))
    credit_score = max(0.0, 1.0 - min(1.0, (payload.avg_credit_utilization_pct or 0.0) / 100.0))

    values = [income_score, emi_score, savings_score, collateral_score, credit_score]

    plt.figure(figsize=(6, 3.5))
    bars = plt.barh(labels, values)
    plt.xlim(0, 1)
    plt.xlabel("Contribution (0..1)")
    plt.title(f"Factor contributions — eligibility {int(prob*100)}%")
    for bar, v in zip(bars, values):
        plt.text(v + 0.01, bar.get_y() + bar.get_height()/2, f"{v:.2f}", va='center')
    plt.tight_layout()
    plt.savefig(out_path, bbox_inches="tight")
    plt.close()

def build_pdf(payload: ManualForm, prob: float, reasons: list, filename: str):
    img_path = f"/tmp/{filename}.png"
    create_chart_image(payload, prob, img_path)
    pdf_path = os.path.join(REPORT_DIR, f"{filename}.pdf")

    c = canvas.Canvas(pdf_path, pagesize=A4)
    width, height = A4
    margin = 40
    y = height - margin

    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y, f"Loan Eligibility Report — {payload.username or 'Applicant'}")
    y -= 28
    c.setFont("Helvetica", 11)
    c.drawString(margin, y, f"Eligibility Probability: {prob*100:.1f}%")
    y -= 18
    c.drawString(margin, y, f"Result: {'Eligible' if prob >= 0.5 else 'Not Eligible'}")
    y -= 24

    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, y, "Key Applicant Details")
    y -= 18
    c.setFont("Helvetica", 10)
    details = [
        f"Age: {payload.age}",
        f"Employment: {payload.employment_type} ({payload.years_of_employment} yrs)",
        f"Annual Salary: {payload.annual_salary}",
        f"Loan Amount: {payload.loan_amount}",
        f"Monthly EMI: {payload.total_emi_amount_per_month}"
    ]
    for d in details:
        c.drawString(margin, y, d)
        y -= 14

    y -= 8
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, y, "Reasons / Suggestions")
    y -= 16
    c.setFont("Helvetica", 10)
    if reasons:
        for r in reasons:
            c.drawString(margin, y, f"• {r}")
            y -= 12
    else:
        c.drawString(margin, y, "No negative reasons detected. Application looks good.")
        y -= 14

    y -= 8
    try:
        img = ImageReader(img_path)
        img_w = width - 2*margin
        img_h = img_w * 0.45
        if y - img_h < margin:
            c.showPage()
            y = height - margin - img_h
        c.drawImage(img, margin, y - img_h, width=img_w, height=img_h)
    except Exception as ex:
        print("Failed to draw image in report:", ex)

    c.showPage()
    c.save()

    try:
        os.remove(img_path)
    except Exception:
        pass

    return pdf_path

# -------------------- API Endpoints --------------------
@app.get("/health")
async def health():
    return {"status": "ok", "service": "loan-mock-backend"}

# Manual form endpoint
@app.post("/manual-form")
async def manual_form(payload: ManualForm, request: Request):
    # Compute eligibility immediately
    prob = compute_mock_probability(payload)
    reasons = reasons_for_ineligibility(payload, prob) if prob < 0.5 else []

    # Create a chatbot session pre-filled with this manual form data
    session_id = str(uuid.uuid4())
    # Only keep fields that chatbot flow is aware of
    answers = {field: getattr(payload, field) for field in CHAT_FIELDS}
    CHAT_SESSIONS[session_id] = {
        "current_field_index": len(CHAT_FIELDS),
        "answers": answers,
    }

    # Build PDF report
    file_id = str(uuid.uuid4())
    filename = f"loan_report_{file_id}"
    pdf_path = build_pdf(payload, prob, reasons, filename)
    result = {
        "status": "success",
        "eligibility": "eligible" if prob >= 0.5 else "not eligible",
        "probability": round(float(prob), 4),
        "reasons": reasons,
        "report_url": f"/reports/{os.path.basename(pdf_path)}",
        "session_id": session_id,
    }
    return JSONResponse(content=result)

# Serve reports
@app.get("/reports/{filename}")
async def get_report(filename: str):
    path = os.path.join(REPORT_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(path, media_type="application/pdf", filename=filename)

# -------------------- Chatbot-guided form endpoint --------------------
# Tracks session state for chatbot input
CHAT_SESSIONS: Dict[str, dict] = {}
CHAT_FIELDS = [
    "username", "age", "gender", "marital_status", "dependents", "education",
    "job_title", "employment_type", "years_of_employment", "annual_salary",
    "collateral_value", "savings_balance", "previous_balance_flag",
    "previous_loan_status", "previous_loan_amount", "total_emi_amount_per_month",
    "loan_purpose", "loan_amount", "repayment_term_months",
    "additional_income_sources", "num_credit_cards", "avg_credit_utilization_pct",
    "late_payment_history", "wants_loan_insurance"
]
FIELD_QUESTIONS = {
    "username": "What's your name?",
    "age": "What is your age?",
    "gender": "What is your gender?",
    "marital_status": "Are you married, single, or other?",
    "dependents": "How many dependents do you have?",
    "education": "What is your highest education?",
    "job_title": "What is your current occupation?",
    "employment_type": "Employment type (salaried/self-employed)?",
    "years_of_employment": "How many years have you been employed?",
    "annual_salary": "What is your annual salary?",
    "collateral_value": "Value of collateral if any?",
    "savings_balance": "Current savings balance?",
    "previous_balance_flag": "Do you have any outstanding previous loan balance? (yes/no)",
    "previous_loan_status": "Status of previous loan (paid/default/other)?",
    "previous_loan_amount": "Previous loan amount if any?",
    "total_emi_amount_per_month": "Total EMI amount per month?",
    "loan_purpose": "Purpose of the loan?",
    "loan_amount": "How much loan do you want?",
    "repayment_term_months": "Repayment term in months?",
    "additional_income_sources": "Any additional sources of income?",
    "num_credit_cards": "How many credit cards do you have?",
    "avg_credit_utilization_pct": "Average credit utilization percentage?",
    "late_payment_history": "Have you had any late payments? (yes/no)",
    "wants_loan_insurance": "Do you want loan insurance? (yes/no)"
}

@app.post("/chatbot-form")
async def chatbot_form(session_id: str, answer: Optional[str] = None):
    """
    Chatbot-guided input. Use session_id to track user progress.
    """
    # Initialize session if not exists
    if session_id not in CHAT_SESSIONS:
        CHAT_SESSIONS[session_id] = {"current_field_index": 0, "answers": {}}

    session = CHAT_SESSIONS[session_id]
    idx = session["current_field_index"]

    # If user provided answer for previous question, store it
    if idx > 0 and answer is not None:
        field_name = CHAT_FIELDS[idx-1]
        val = answer
        # convert yes/no to bool for boolean fields
        if field_name in ["previous_balance_flag", "late_payment_history", "wants_loan_insurance"]:
            val = answer.strip().lower() in ["yes", "true", "1"]
        # convert numbers
        elif field_name in ["age", "dependents", "years_of_employment", "annual_salary",
                            "collateral_value", "savings_balance", "previous_loan_amount",
                            "total_emi_amount_per_month", "loan_amount",
                            "repayment_term_months", "num_credit_cards", "avg_credit_utilization_pct"]:
            try:
                val = float(answer)
                if val.is_integer():
                    val = int(val)
            except Exception:
                val = 0
        session["answers"][field_name] = val

    # If all fields answered, compute result
    if idx >= len(CHAT_FIELDS):
        payload = ManualForm(**session["answers"])
        prob = compute_mock_probability(payload)
        reasons = reasons_for_ineligibility(payload, prob) if prob < 0.5 else []
        file_id = str(uuid.uuid4())
        filename = f"loan_report_{file_id}"
        pdf_path = build_pdf(payload, prob, reasons, filename)

        # Cleanup session
        del CHAT_SESSIONS[session_id]

        return {
            "status": "completed",
            "eligibility": "eligible" if prob >= 0.5 else "not eligible",
            "probability": round(float(prob), 4),
            "reasons": reasons,
            "report_url": f"/reports/{os.path.basename(pdf_path)}"
        }

    # Ask next question
    question = FIELD_QUESTIONS[CHAT_FIELDS[idx]]
    session["current_field_index"] += 1
    return {"status": "in_progress", "question": question}
