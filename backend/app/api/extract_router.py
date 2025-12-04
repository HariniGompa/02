# app/api/extract_router.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, Any
import os
import shutil
from app.ml.inference import predict_model

router = APIRouter()

UPLOAD_DIR = "uploads"

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -----------------------------
# Document Upload + ML Prediction
# -----------------------------
@router.post("/run")
async def extract_and_predict(file: UploadFile = File(...)):
    try:
        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # TODO: Replace this with your actual extraction logic
        # For now, we simulate extracted features
        extracted_features: Dict[str, Any] = {
            "username": "extracted_user",
            "gender": "male",
            "marital_status": "single",
            "age": 30,
            "annual_salary": 50000,
            "loan_amount": 20000,
            "repayment_term_months": 24
        }

        # Run ML prediction
        result = predict_model(extracted_features)

        # Return combined response
        return {
            "filename": file.filename,
            "extracted_features": extracted_features,
            "eligible": result.get("approved", False),
            "probability": result.get("probability", 0.0),
            "decision": result.get("decision", "Pending")
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction/Prediction error: {str(e)}")

    finally:
        await file.close()
