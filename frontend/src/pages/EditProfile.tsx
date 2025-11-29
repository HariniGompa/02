"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function EditProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<any>({
    username: "",
    email: "",
    gender: "",
    age: "",
    education: "",
    marital_status: "",
    dependents: "",
    nationality: "",

    job_type: "",
    years_employed: "",
    annual_salary: "",
    collateral_value: "",
    employment_type: "",

    previous_loan: "",
    previous_loan_status: "",
    previous_loan_amount: "",
    total_emi: "",
    savings_balance: "",
    credit_history: "",

    rent_income: "",
    interest_income: "",
    num_credit_cards: "",
    avg_credit_utilization: "",
    late_payment_history: "",
    loan_insurance: "",
  });

  // Fetch current profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) console.error("Supabase fetch error:", error);
      else if (data) {
        setFormData({
          username: data.username,
          email: data.email,
          gender: data.gender,
          age: data.age,
          education: data.education,
          marital_status: data.marital_status,
          dependents: data.dependents,
          nationality: data.nationality,

          job_type: data.job_type,
          years_employed: data.years_of_employment,
          annual_salary: data.annual_salary,
          collateral_value: data.collateral_value,
          employment_type: data.employment_type,

          previous_loan: data.previous_loan,
          previous_loan_status: data.previous_loan_status,
          previous_loan_amount: data.previous_loan_amount,
          total_emi: data.total_emi,
          savings_balance: data.savings_balance,
          credit_history: data.credit_history,

          rent_income: data.rent_income,
          interest_income: data.interest_income,
          num_credit_cards: data.num_credit_cards,
          avg_credit_utilization: data.avg_credit_utilization,
          late_payment_history: data.late_payment_history,
          loan_insurance: data.loan_insurance,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not logged in");

      const { error } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          email: formData.email,
          gender: formData.gender,
          age: formData.age,
          education: formData.education,
          marital_status: formData.marital_status,
          dependents: formData.dependents,
          nationality: formData.nationality,

          job_type: formData.job_type,
          years_of_employment: formData.years_employed,
          annual_salary: formData.annual_salary,
          collateral_value: formData.collateral_value,
          employment_type: formData.employment_type,

          previous_loan: formData.previous_loan,
          previous_loan_status: formData.previous_loan_status,
          previous_loan_amount: formData.previous_loan_amount,
          total_emi: formData.total_emi,
          savings_balance: formData.savings_balance,
          credit_history: formData.credit_history,

          rent_income: formData.rent_income,
          interest_income: formData.interest_income,
          num_credit_cards: formData.num_credit_cards,
          avg_credit_utilization: formData.avg_credit_utilization,
          late_payment_history: formData.late_payment_history,
          loan_insurance: formData.loan_insurance,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });

      navigate("/profile");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>

      <div className="space-y-6">
        <Section title="Personal Information">
          {InputRow("Username", "username", formData.username, (v) => updateField("username", v))}
          {InputRow("Email", "email", formData.email, (v) => updateField("email", v))}
          {SelectRow("Gender", "gender", formData.gender, ["Female","Male","Other"], updateField)}
          {InputRow("Age", "age", formData.age, (v) => updateField("age", parseInt(v)))}
          {SelectRow("Education", "education", formData.education, ["High school","Bachelor's degree","Master's degree","PhD","Uneducated"], updateField)}
          {SelectRow("Marital Status", "marital_status", formData.marital_status, ["Single","Married","Divorced"], updateField)}
          {InputRow("Dependents", "dependents", formData.dependents, (v) => updateField("dependents", parseInt(v)))}
          {InputRow("Nationality", "nationality", formData.nationality, (v) => updateField("nationality", v))}
        </Section>

        <Section title="Employment Details">
          {InputRow("Job Type", "job_type", formData.job_type, (v) => updateField("job_type", v))}
          {InputRow("Years of Employment", "years_employed", formData.years_employed, (v) => updateField("years_employed", parseFloat(v)))}
          {InputRow("Annual Salary", "annual_salary", formData.annual_salary, (v) => updateField("annual_salary", parseFloat(v)))}
          {InputRow("Collateral Value", "collateral_value", formData.collateral_value, (v) => updateField("collateral_value", parseFloat(v)))}
          {InputRow("Employment Type", "employment_type", formData.employment_type, (v) => updateField("employment_type", v))}
        </Section>

        <Section title="Financial History">
          {InputRow("Previous Loan", "previous_loan", formData.previous_loan, (v) => updateField("previous_loan", v))}
          {InputRow("Previous Loan Status", "previous_loan_status", formData.previous_loan_status, (v) => updateField("previous_loan_status", v))}
          {InputRow("Previous Loan Amount", "previous_loan_amount", formData.previous_loan_amount, (v) => updateField("previous_loan_amount", parseFloat(v)))}
          {InputRow("Total EMI Amount", "total_emi", formData.total_emi, (v) => updateField("total_emi", parseFloat(v)))}
          {InputRow("Savings Bank Balance", "savings_balance", formData.savings_balance, (v) => updateField("savings_balance", parseFloat(v)))}
          {InputRow("Credit History", "credit_history", formData.credit_history, (v) => updateField("credit_history", v))}
        </Section>

        <Section title="Additional Income & Credit">
          {InputRow("Rent Income", "rent_income", formData.rent_income, (v) => updateField("rent_income", parseFloat(v)))}
          {InputRow("Interest Income", "interest_income", formData.interest_income, (v) => updateField("interest_income", parseFloat(v)))}
          {InputRow("Number of Credit Cards", "num_credit_cards", formData.num_credit_cards, (v) => updateField("num_credit_cards", parseInt(v)))}
          {InputRow("Average Credit Utilization (%)", "avg_credit_utilization", formData.avg_credit_utilization, (v) => updateField("avg_credit_utilization", parseFloat(v)))}
          {CheckboxRow("Late Payment History", "late_payment_history", formData.late_payment_history, updateField)}
          {CheckboxRow("Loan Insurance", "loan_insurance", formData.loan_insurance, updateField)}
        </Section>

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

/* ---------- Reusable Components ---------- */

function Section({ title, children }: any) {
  return (
    <div className="bg-white p-6 mb-6 shadow rounded-xl">
      <h2 className="font-semibold mb-4 border-b pb-2">{title}</h2>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function InputRow(label: string, id: string, value: any, onChange: (v: any) => void) {
  return (
    <div className="flex flex-col">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectRow(label: string, id: string, value: any, options: string[], updateField: (field: string, value: any) => void) {
  return (
    <div className="flex flex-col">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => updateField(id, v)}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function CheckboxRow(label: string, id: string, checked: boolean, updateField: (field: string, value: any) => void) {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => updateField(id, e.target.checked)}
        className="w-4 h-4"
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
