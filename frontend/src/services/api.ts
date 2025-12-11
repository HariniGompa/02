import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface LoanApplication {
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
  additional_income_sources?: string;
  num_credit_cards?: number;
  avg_credit_utilization_pct?: number;
  late_payment_history?: boolean;
  wants_loan_insurance?: boolean;
}

export interface LoanResponse {
  probability: number;
  reasons: string[];
  report_url: string;
  message?: string;
}

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.status === 200;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
};

export const submitLoanApplication = async (data: LoanApplication): Promise<LoanResponse> => {
  try {
    const response = await axios.post<LoanResponse>(`${API_BASE_URL}/manual-form`, data);
    return response.data;
  } catch (error) {
    console.error('Error submitting loan application:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.message || 'Failed to submit application');
    }
    throw new Error('Network error occurred');
  }
};

export const downloadReport = async (reportUrl: string): Promise<void> => {
  try {
    const response = await axios.get(reportUrl, { 
      responseType: 'blob',
      baseURL: API_BASE_URL
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `loan-report-${Date.now()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Error downloading report:', error);
    throw new Error('Failed to download report');
  }
};