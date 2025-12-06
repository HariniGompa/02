# app/api/extract_router.py
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import Dict, Any, Optional
import os
import shutil
import logging
from pathlib import Path
import PyPDF2
from PIL import Image
import pytesseract
import io
import re

from app.ml.inference import predict_model

router = APIRouter()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_path: Path) -> str:
    """Extract text from PDF file."""
    text = []
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text.append(page.extract_text() or '')
        return '\n'.join(text)
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from PDF"
        )

def extract_text_from_image(file_path: Path) -> str:
    """Extract text from image using OCR."""
    try:
        image = Image.open(file_path)
        return pytesseract.image_to_string(image)
    except Exception as e:
        logger.error(f"Error extracting text from image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from image"
        )

def extract_loan_details(text: str) -> Dict[str, Any]:
    """Extract loan details from extracted text."""
    # Initialize with default values
    details = {
        "loan_amount": 0,
        "annual_salary": 0,
        "repayment_term_months": 0,
        "gender": "unknown",
        "marital_status": "unknown",
        "age": 0
    }
    
    try:
        # Extract loan amount (look for $ followed by numbers with commas/decimals)
        amount_match = re.search(r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', text)
        if amount_match:
            details["loan_amount"] = float(amount_match.group(1).replace(',', ''))
        
        # Extract salary (look for terms like 'salary', 'income' followed by $ amount)
        salary_matches = re.finditer(r'(?:salary|income).{0,20}?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', text, re.IGNORECASE)
        if salary_matches:
            for match in salary_matches:
                details["annual_salary"] = max(details["annual_salary"], float(match.group(1).replace(',', '')))
        
        # Extract loan term (look for terms like 'term', 'duration' followed by months/years)
        term_match = re.search(r'(?:term|duration).*?(\d+)\s*(?:months?|years?|yrs?)', text, re.IGNORECASE)
        if term_match:
            term = int(term_match.group(1))
            if 'year' in term_match.group(0).lower() or 'yr' in term_match.group(0).lower():
                term *= 12  # Convert years to months
            details["repayment_term_months"] = term
        
        # Extract basic personal info
        if re.search(r'\b(male|m|man|gentleman)\b', text, re.IGNORECASE):
            details["gender"] = "male"
        elif re.search(r'\b(female|f|woman|girl|lady)\b', text, re.IGNORECASE):
            details["gender"] = "female"
            
        if re.search(r'\b(married|spouse|wife|husband|partner)\b', text, re.IGNORECASE):
            details["marital_status"] = "married"
        elif re.search(r'\b(single|unmarried|divorced|widow|widower)\b', text, re.IGNORECASE):
            details["marital_status"] = "single"
        
        # Extract age
        age_match = re.search(r'\b(?:age|yo|y\.?o\.?|years? old)[: ]*?(\d{2})\b', text, re.IGNORECASE)
        if age_match:
            details["age"] = int(age_match.group(1))
        
        return details
    except Exception as e:
        logger.error(f"Error extracting loan details: {str(e)}")
        return details  # Return partial details if extraction fails

@router.post("/run")
async def extract_and_predict(file: UploadFile = File(...)):
    # Validate file
    if not file or file.filename == '':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file selected"
        )
    
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    try:
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract text based on file type
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        text = ""
        
        if file_ext == 'pdf':
            text = extract_text_from_pdf(file_path)
        elif file_ext in {'png', 'jpg', 'jpeg'}:
            text = extract_text_from_image(file_path)
        
        # Extract loan details from text
        extracted_features = extract_loan_details(text)
        
        # Add filename to features
        extracted_features["document_name"] = file.filename
        
        # Run ML prediction
        prediction = predict_model(extracted_features)
        
        # Return combined response
        return {
            "filename": file.filename,
            "extracted_text": text[:1000] + "..." if len(text) > 1000 else text,  # Return first 1000 chars
            "extracted_features": extracted_features,
            "eligible": prediction.get("eligible", False),
            "probability": prediction.get("probability", 0.0),
            "decision": "Approved" if prediction.get("eligible") else "Not Approved"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )
    finally:
        await file.close()
        # Clean up the uploaded file
        if 'file_path' in locals() and file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                logger.warning(f"Could not delete temporary file {file_path}: {str(e)}")
