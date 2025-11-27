// Placeholder ML API integration functions
// Replace ML_API_URL with your actual HuggingFace Spaces endpoint

const ML_API_URL = "https://example-ml-api.hf.space/predict";

export interface MLPredictionRequest {
  username?: string;
  gender?: string;
  marital_status?: string;
  dependents?: number;
  education?: string;
  age?: number;
  job_title?: string;
  annual_salary?: number;
  collateral_value?: number;
  savings_balance?: number;
  employment_type?: string;
  years_of_employment?: number;
  previous_balance_flag?: boolean;
  previous_loan_status?: string;
  previous_loan_amount?: number;
  total_emi_amount_per_month?: number;
  loan_purpose?: string;
  loan_amount?: number;
  repayment_term_months?: number;
  bank_name?: string;
  additional_income_sources?: string;
  num_credit_cards?: number;
  avg_credit_utilization_pct?: number;
  late_payment_history?: boolean;
  wants_loan_insurance?: boolean;
}

export interface MLPredictionResponse {
  eligible: boolean;
  probability: number;
  threshold?: number;
  shap?: any;
  explanation_summary?: string;
  recommendations?: string[];
}

/**
 * Send chatbot message data to ML backend
 * This function sends extracted/parsed data from chat interactions to the ML model
 */
export async function sendToMLBackend(
  messageData: MLPredictionRequest
): Promise<MLPredictionResponse> {
  try {
    const response = await fetch(ML_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      throw new Error(`ML API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling ML backend:", error);
    throw error;
  }
}

/**
 * Send manual form data to ML backend
 * This function sends structured form data to the ML model for prediction
 */
export async function sendManualFormToMLBackend(
  formData: MLPredictionRequest
): Promise<MLPredictionResponse> {
  try {
    const response = await fetch(ML_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error(`ML API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling ML backend:", error);
    throw error;
  }
}

/**
 * Update the ML API URL
 * Use this to configure your HuggingFace Spaces endpoint
 */
export function setMLApiUrl(url: string) {
  // In production, you might want to store this in environment variables
  console.log(`ML API URL would be set to: ${url}`);
  // For now, this is a placeholder. You can implement proper config management.
}