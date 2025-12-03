"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function EditProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<any>({
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

  /* ------------------------- Fetch profile ------------------------- */
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) console.error(error);
      else if (data) setProfile(data);

      setLoading(false);
    };

    loadProfile();
  }, [navigate]);

  /* ------------------------- Handle input change ------------------------- */
  const updateField = (e: any) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  /* ------------------------- Save profile ------------------------- */
  const handleSave = async () => {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("id", user!.id);

    if (error) {
      console.error("Save error:", error);
      setSaving(false);
      return;
    }

    navigate("/profile");
  };

  if (loading) return <div className="p-4">Loading...</div>;

  /* ------------------------- UI ------------------------- */
  return (
    <div className="max-w-4xl mx-auto p-6">

      {/* Header */}
      <div className="mb-6 bg-white p-6 shadow rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Edit Profile</h1>
          <p className="text-gray-500">Update your personal information</p>
        </div>
      </div>

      {/* PERSONAL INFO */}
      <Section title="Personal Information">
        {Input("username", "Username", profile.username, updateField)}
        {Input("email", "Email", profile.email, updateField)}
        {Input("gender", "Gender", profile.gender, updateField)}
        {Input("age", "Age", profile.age, updateField)}
        {Input("education", "Education", profile.education, updateField)}
        {Input("marital_status", "Marital Status", profile.marital_status, updateField)}
        {Input("dependents", "Dependents", profile.dependents, updateField)}
        {Input("nationality", "Nationality", profile.nationality, updateField)}
      </Section>

      {/* EMPLOYMENT */}
      <Section title="Employment Details">
        {Input("job_type", "Job Type", profile.job_type, updateField)}
        {Input("years_employed", "Years of Employment", profile.years_employed, updateField)}
        {Input("annual_salary", "Annual Salary", profile.annual_salary, updateField)}
        {Input("collateral_value", "Collateral Value", profile.collateral_value, updateField)}
        {Input("employment_type", "Employment Type", profile.employment_type, updateField)}
      </Section>

      {/* FINANCIAL HISTORY */}
      <Section title="Financial History">
        {Input("previous_loan", "Previous Loan", profile.previous_loan, updateField)}
        {Input("previous_loan_status", "Previous Loan Status", profile.previous_loan_status, updateField)}
        {Input("previous_loan_amount", "Previous Loan Amount", profile.previous_loan_amount, updateField)}
        {Input("total_emi", "Total EMI Amount", profile.total_emi, updateField)}
        {Input("savings_balance", "Savings Bank Balance", profile.savings_balance, updateField)}
        {Input("credit_history", "Credit History", profile.credit_history, updateField)}
      </Section>

      {/* ADDITIONAL INCOME & CREDIT */}
      <Section title="Additional Income & Credit Details">
        {Input("rent_income", "Rent Income", profile.rent_income, updateField)}
        {Input("interest_income", "Interest Income", profile.interest_income, updateField)}
        {Input("num_credit_cards", "Number of Credit Cards", profile.num_credit_cards, updateField)}
        {Input("avg_credit_utilization", "Average Credit Utilization (%)", profile.avg_credit_utilization, updateField)}
        {Input("late_payment_history", "Late Payment History", profile.late_payment_history, updateField)}
        {Input("loan_insurance", "Loan Insurance", profile.loan_insurance, updateField)}
      </Section>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => navigate("/profile")}
          className="px-4 py-2 bg-gray-300 rounded-lg"
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------- Reusable Components ------------------------- */

function Section({ title, children }: any) {
  return (
    <div className="bg-white p-6 mb-6 shadow rounded-xl">
      <h2 className="font-semibold mb-4 border-b pb-2">{title}</h2>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Input(name: string, label: string, value: any, onChange: any) {
  return (
    <div className="flex flex-col">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        name={name}
        value={value || ""}
        onChange={onChange}
        className="p-2 border rounded-md bg-gray-50"
      />
    </div>
  );
}
