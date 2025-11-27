import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { sendManualFormToMLBackend } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";

const ManualForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
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
    bank_name: "",
    additional_income_sources: "",
    num_credit_cards: 0,
    avg_credit_utilization_pct: 0,
    late_payment_history: false,
    wants_loan_insurance: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call ML backend
      const prediction = await sendManualFormToMLBackend(formData);

      // Save to database if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("loan_applications").insert({
          user_id: user.id,
          input_data: formData,
          eligibility: prediction.eligible ? "Eligible" : "Not Eligible",
          probability: prediction.probability,
          recommendations: prediction.recommendations?.join(", ") || null,
        });
      }

      // Store prediction in localStorage and navigate to chatbot
      localStorage.setItem("prediction_result", JSON.stringify(prediction));
      
      toast({
        title: "Application Submitted",
        description: "Redirecting to view your results...",
      });

      navigate("/chatbot");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process application",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
                    onChange={(e) => updateField("age", parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dependents">Dependents</Label>
                  <Input
                    id="dependents"
                    type="number"
                    value={formData.dependents}
                    onChange={(e) => updateField("dependents", parseInt(e.target.value))}
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
                      onChange={(e) => updateField("years_of_employment", parseFloat(e.target.value))}
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
                    onChange={(e) => updateField("annual_salary", parseFloat(e.target.value))}
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
                    onChange={(e) => updateField("savings_balance", parseFloat(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collateral_value">Collateral Value</Label>
                  <Input
                    id="collateral_value"
                    type="number"
                    value={formData.collateral_value}
                    onChange={(e) => updateField("collateral_value", parseFloat(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="num_credit_cards">Number of Credit Cards</Label>
                  <Input
                    id="num_credit_cards"
                    type="number"
                    value={formData.num_credit_cards}
                    onChange={(e) => updateField("num_credit_cards", parseInt(e.target.value))}
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
                    onChange={(e) => updateField("avg_credit_utilization_pct", parseFloat(e.target.value))}
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
                    onCheckedChange={(checked) => updateField("late_payment_history", checked)}
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
                  onCheckedChange={(checked) => updateField("previous_balance_flag", checked)}
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
                      onChange={(e) => updateField("previous_loan_amount", parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_emi_amount_per_month">Total EMI Per Month</Label>
                    <Input
                      id="total_emi_amount_per_month"
                      type="number"
                      value={formData.total_emi_amount_per_month}
                      onChange={(e) => updateField("total_emi_amount_per_month", parseFloat(e.target.value))}
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
                    onChange={(e) => updateField("loan_amount", parseFloat(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repayment_term_months">Repayment Term (months)</Label>
                  <Input
                    id="repayment_term_months"
                    type="number"
                    value={formData.repayment_term_months}
                    onChange={(e) => updateField("repayment_term_months", parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => updateField("bank_name", e.target.value)}
                    placeholder="Enter bank name or leave blank"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="wants_loan_insurance"
                    checked={formData.wants_loan_insurance}
                    onCheckedChange={(checked) => updateField("wants_loan_insurance", checked)}
                  />
                  <Label htmlFor="wants_loan_insurance">Want Loan Insurance</Label>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ManualForm;