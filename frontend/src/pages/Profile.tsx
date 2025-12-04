"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const getProfile = async () => {
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

      if (error) {
        console.error("Supabase fetch error:", error);
      } else if (data) {
        // Map Supabase columns to profile state
        setProfile({
          username: data.username,
          email: data.email,
          gender: data.gender,
          age: data.age,
          education: data.education,
          marital_status: data.marital_status,
          dependents: data.dependents,
          nationality: data.nationality,

          job_type: data.job_type,
          years_employed: data.years_of_employment, // mapping example
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

    getProfile();
  }, [navigate]);

  if (loading) return <div className="p-4">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 bg-white p-6 shadow rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{profile.username}</h1>
          <p className="text-gray-500">{profile.email}</p>
        </div>
        <button
        onClick={() => navigate("/profile/edit")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Edit Profile
        </button>
      </div>

      {/* Personal Information */}
      <Section title="Personal Information">
        {Row("Username", profile.username)}
        {Row("Email", profile.email)}
        {Row("Gender", profile.gender)}
        {Row("Age", profile.age)}
        {Row("Education", profile.education)}
        {Row("Marital Status", profile.marital_status)}
        {Row("Dependents", profile.dependents)}
        {Row("Nationality", profile.nationality)}
      </Section>

      {/* Employment Details */}
      <Section title="Employment Details">
        {Row("Job Type", profile.job_type)}
        {Row("Years of Employment", profile.years_employed)}
        {Row("Annual Salary", profile.annual_salary)}
        {Row("Collateral Value", profile.collateral_value)}
        {Row("Employment Type", profile.employment_type)}
      </Section>

      {/* Financial History */}
      <Section title="Financial History">
        {Row("Previous Loan", profile.previous_loan)}
        {Row("Previous Loan Status", profile.previous_loan_status)}
        {Row("Previous Loan Amount", profile.previous_loan_amount)}
        {Row("Total EMI Amount", profile.total_emi)}
        {Row("Savings Bank Balance", profile.savings_balance)}
        {Row("Credit History", profile.credit_history)}
      </Section>

      {/* Additional Income & Credit */}
      <Section title="Additional Income & Credit">
        {Row("Rent Income", profile.rent_income)}
        {Row("Interest Income", profile.interest_income)}
        {Row("Number of Credit Cards", profile.num_credit_cards)}
        {Row("Average Credit Utilization (%)", profile.avg_credit_utilization)}
        {Row("Late Payment History", profile.late_payment_history)}
        {Row("Loan Insurance", profile.loan_insurance)}
      </Section>
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

function Row(label: string, value: any) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-base bg-gray-100 p-2 rounded-md">
        {value || "-"}
      </span>
    </div>
  );
}
