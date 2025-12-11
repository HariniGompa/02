import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { submitLoanApplication, downloadReport, type LoanApplication } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

const ManualForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ probability: number; reasons: string[]; report_url: string } | null>(null);

  /**
   * NOTE:
   * - Numeric inputs are initialized as empty strings ("") so inputs show blank instead of 0.
   * - We convert and validate before submit.
   */
  const [formData, setFormData] = useState<LoanApplication>({
    username: "",
    gender: "",
    marital_status: "",
    dependents: 0,
    education: "",
    age: 0,
    job_title: "",
    annual_salary: 0,
    collateral_value: 0,
    savings_balance: 0,
    employment_type: "",
    years_of_employment: 0,
    previous_balance_flag: false,
    previous_loan_status: "",
    previous_loan_amount: 0,
    total_emi_amount_per_month: 0,
    loan_purpose: "",
    loan_amount: 0,
    repayment_term_months: 0,
    additional_income_sources: "",
    num_credit_cards: 0,
    avg_credit_utilization_pct: 0,
    late_payment_history: false,
    wants_loan_insurance: false,
  });

  // Safe parser: returns "" while user is editing or a Number when valid
  const parseNumberSafe = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    // If it's already a number (rare case), return it
    if (typeof value === "number" && !isNaN(value)) return value;
    // Remove commas and spaces (users sometimes paste formatted numbers)
    const cleaned = String(value).replace(/,/g, "").trim();
    if (cleaned === "") return "";
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : "";
  };

  // Update single field generically
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Convert formData into a backend-safe payload:
  // - convert numeric empty strings => 0 (or null if you prefer)
  // - ensure integer fields are integers
  const sanitizeForSubmit = (data) => {
    const intFields = ["dependents", "age", "num_credit_cards", "repayment_term_months"];
    const floatFields = [
      "annual_salary",
      "collateral_value",
      "savings_balance",
      "years_of_employment",
      "previous_loan_amount",
      "total_emi_amount_per_month",
      "loan_amount",
      "avg_credit_utilization_pct",
    ];

    const cleaned = { ...data };

    // Convert empty numeric strings -> 0 (you can change to null if backend expects that)
    Object.entries(cleaned).forEach(([k, v]) => {
      if (intFields.includes(k)) {
        // integers
        if (v === "" || v === null || v === undefined) cleaned[k] = 0;
        else {
          const n = Number(v);
          cleaned[k] = Number.isFinite(n) ? Math.trunc(n) : 0;
        }
      } else if (floatFields.includes(k)) {
        if (v === "" || v === null || v === undefined) cleaned[k] = 0;
        else {
          const n = Number(v);
          cleaned[k] = Number.isFinite(n) ? n : 0;
        }
      } else {
        // leave booleans and strings untouched
        if (typeof v === "string") cleaned[k] = v.trim();
      }
    });

    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const payload = sanitizeForSubmit(formData);
      const response = await submitLoanApplication(payload);

      // Normalize report URL to full backend URL so it works in all environments
      const backendBase = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const fullReportUrl = response.report_url
        ? `${backendBase}${response.report_url}`
        : "";

      setResult({ ...response, report_url: fullReportUrl });

      // Prepare prediction object for chatbot UI
      const predictionForChat = {
        eligible: response.eligibility
          ? response.eligibility === "eligible"
          : response.probability >= 0.5,
        probability: response.probability,
        reason: response.reasons?.join(", ") || "",
        recommendations: [] as string[],
        report_url: fullReportUrl,
        session_id: response.session_id,
      };

      // Make result available for Chatbot page
      try {
        localStorage.setItem("prediction_result", JSON.stringify(predictionForChat));
      } catch (storageErr) {
        console.warn("Failed to persist prediction for chatbot:", storageErr);
      }

      // store in supabase if user exists
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("loan_applications").insert({
            user_id: user.id,
            input_data: payload,
            eligibility: response.probability >= 0.7 ? "Eligible" : "Not Eligible",
            probability: response.probability,
            recommendations: response.reasons?.join?.(", ") || null,
          });
        }
      } catch (sbErr) {
        // don't block the main flow if supabase fails — show toast and continue
        console.warn("Supabase insert failed:", sbErr);
      }

      toast({
        title: "Application submitted successfully!",
        description: "Your loan application has been processed.",
      });

      // Optionally redirect user into chatbot with this session
      if (response.session_id) {
        navigate(`/chatbot?session_id=${encodeURIComponent(response.session_id)}`);
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle report download
  const handleDownloadReport = async () => {
    if (!result?.report_url) return;
    
    try {
      await downloadReport(result.report_url);
      toast({
        title: "Download started",
        description: "Your report is being downloaded.",
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Download failed",
        description: "Could not download the report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Render results
  const renderResults = () => {
    if (!result) return null;

    const probability = result.probability * 100;
    const isEligible = probability >= 70; // Example threshold

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Loan Application Result</CardTitle>
          <CardDescription>
            {isEligible ? 'Congratulations! Your loan application looks promising.' : 'Your loan application needs review.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span>Approval Probability</span>
                <span>{probability.toFixed(1)}%</span>
              </div>
              <Progress value={probability} className="h-2" />
            </div>

            {result.reasons && result.reasons.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Key Factors:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {result.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setResult(null)}>
            Back to Form
          </Button>
          <Button onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download Full Report
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-accent p-4">
      <div className="container max-w-4xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/chatbot")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chatbot
        </Button>

        <Card className="p-8 gradient-card">
          <h1 className="text-3xl font-bold mb-6">Loan Application Form</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => updateField("username", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marital_status">Marital Status</Label>
                  <Select value={formData.marital_status} onValueChange={(v) => updateField("marital_status", v)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => updateField("age", parseNumberSafe(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dependents">Dependents</Label>
                  <Input
                    id="dependents"
                    type="number"
                    value={formData.dependents}
                    onChange={(e) => updateField("dependents", parseNumberSafe(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Select value={formData.education} onValueChange={(v) => updateField("education", v)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select education" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High school">High School</SelectItem>
                      <SelectItem value="Bachelor's degree">Bachelor's Degree</SelectItem>
                      <SelectItem value="Master's degree">Master's Degree</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                      <SelectItem value="Uneducated">Uneducated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Employment Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => updateField("job_title", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Select value={formData.employment_type} onValueChange={(v) => updateField("employment_type", v)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                      <SelectItem value="Startup">Startup</SelectItem>
                      <SelectItem value="Contract">Contract-based</SelectItem>
                      <SelectItem value="Unemployed">Unemployed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.employment_type === "Contract" && (
                  <div className="space-y-2">
                    <Label htmlFor="years_of_employment">Years of Employment</Label>
                    <Input
                      id="years_of_employment"
                      type="number"
                      step="0.1"
                      value={formData.years_of_employment}
                      onChange={(e) => updateField("years_of_employment", parseNumberSafe(e.target.value))}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="annual_salary">Annual Salary</Label>
                  <Input
                    id="annual_salary"
                    type="number"
                    value={formData.annual_salary}
                    onChange={(e) => updateField("annual_salary", parseNumberSafe(e.target.value))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Financial Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="savings_balance">Savings / Bank Balance</Label>
                  <Input
                    id="savings_balance"
                    type="number"
                    value={formData.savings_balance}
                    onChange={(e) => updateField("savings_balance", parseNumberSafe(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collateral_value">Collateral Value</Label>
                  <Input
                    id="collateral_value"
                    type="number"
                    value={formData.collateral_value}
                    onChange={(e) => updateField("collateral_value", parseNumberSafe(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="num_credit_cards">Number of Credit Cards</Label>
                  <Input
                    id="num_credit_cards"
                    type="number"
                    value={formData.num_credit_cards}
                    onChange={(e) => updateField("num_credit_cards", parseNumberSafe(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avg_credit_utilization_pct">Average Credit Utilization (%)</Label>
                  <Input
                    id="avg_credit_utilization_pct"
                    type="number"
                    step="0.1"
                    value={formData.avg_credit_utilization_pct}
                    onChange={(e) => updateField("avg_credit_utilization_pct", parseNumberSafe(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="additional_income_sources">Additional Income Sources</Label>
                  <Textarea
                    id="additional_income_sources"
                    value={formData.additional_income_sources}
                    onChange={(e) => updateField("additional_income_sources", e.target.value)}
                    placeholder="Describe any additional income sources..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="late_payment_history"
                    checked={formData.late_payment_history}
                    onCheckedChange={(checked) => updateField("late_payment_history", !!checked)}
                  />
                  <Label htmlFor="late_payment_history">Late Payment History</Label>
                </div>
              </div>
            </div>

            {/* Previous Loan History */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="previous_balance_flag"
                  checked={formData.previous_balance_flag}
                  onCheckedChange={(checked) => updateField("previous_balance_flag", !!checked)}
                />
                <Label htmlFor="previous_balance_flag" className="text-xl font-bold">Previous Loan History</Label>
              </div>

              {formData.previous_balance_flag && (
                <div className="grid md:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="previous_loan_status">Previous Loan Status</Label>
                    <Select value={formData.previous_loan_status} onValueChange={(v) => updateField("previous_loan_status", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fully paid">Fully Paid</SelectItem>
                        <SelectItem value="Ongoing">Ongoing</SelectItem>
                        <SelectItem value="Defaulted">Defaulted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="previous_loan_amount">Previous Loan Amount</Label>
                    <Input
                      id="previous_loan_amount"
                      type="number"
                      value={formData.previous_loan_amount}
                      onChange={(e) => updateField("previous_loan_amount", parseNumberSafe(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_emi_amount_per_month">Total EMI Per Month</Label>
                    <Input
                      id="total_emi_amount_per_month"
                      type="number"
                      value={formData.total_emi_amount_per_month}
                      onChange={(e) => updateField("total_emi_amount_per_month", parseNumberSafe(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Loan Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Loan Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loan_purpose">Loan Purpose</Label>
                  <Select value={formData.loan_purpose} onValueChange={(v) => updateField("loan_purpose", v)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Home">Home</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Vehicle">Vehicle</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Agriculture">Agriculture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loan_amount">Loan Amount</Label>
                  <Input
                    id="loan_amount"
                    type="number"
                    value={formData.loan_amount}
                    onChange={(e) => updateField("loan_amount", parseNumberSafe(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repayment_term_months">Repayment Term (months)</Label>
                  <Input
                    id="repayment_term_months"
                    type="number"
                    value={formData.repayment_term_months}
                    onChange={(e) => updateField("repayment_term_months", parseNumberSafe(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Moved here for full-width below grid */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wants_loan_insurance"
                  checked={formData.wants_loan_insurance}
                  onCheckedChange={(checked) => updateField("wants_loan_insurance", !!checked)}
                />
                <Label htmlFor="wants_loan_insurance">Want Loan Insurance</Label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </form>
          {renderResults()}
        </Card>
      </div>
    </div>
  );
};

export default ManualForm;
