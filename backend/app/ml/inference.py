import numpy as np
from typing import Dict, Any

def predict_model(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Safe ML prediction with JSON-clean output
    """

    try:
        processed_features = preprocess_features(features)

        # ------------------------------
        # Dummy prediction (replace later)
        eligible = True
        probability = 0.85
        # ------------------------------

        return {
            "eligible": bool(eligible),
            "probability": float(probability),
            "threshold": 0.5,
            "shap": {},
            "explanation_summary": "Dummy prediction output.",
            "recommendations": ["Maintain good credit history."]
        }

    except Exception as e:
        # If ANY error happens, always return JSON (not HTML)
        return {
            "error": True,
            "message": f"Prediction error: {str(e)}"
        }


def preprocess_features(features: Dict[str, Any]) -> Dict[str, Any]:
    processed = {}

    for key, value in features.items():

        # convert numpy → python native types
        if isinstance(value, (np.integer, np.int64, np.int32)):
            value = int(value)
        if isinstance(value, (np.floating, np.float32, np.float64)):
            value = float(value)

        processed[key] = value

    # Example preprocessing
    gender = features.get("gender", "").lower()
    processed["gender"] = 1 if gender == "male" else 0

    marital = features.get("marital_status", "").lower()
    processed["is_married"] = 1 if marital == "married" else 0

    return processed
