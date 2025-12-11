"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<any>({
    username: "",
    email: "",
    phone_number: "",
    contact_consent: false,
    two_fa_enabled: false,
    created_at: "",
    updated_at: "",
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
          phone_number: data.phone_number,
          contact_consent: data.contact_consent,
          two_fa_enabled: data.two_fa_enabled,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      }

      setLoading(false);
    };

    getProfile();
  }, [navigate]);

  if (loading) return <div className="p-4">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back to Chatbot Button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/chatbot")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Chatbot
      </Button>
      
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
        {Row("Phone Number", profile.phone_number)}
      </Section>

      {/* Account Settings */}
      <Section title="Account Settings">
        {Row("Contact Consent", profile.contact_consent ? "Enabled" : "Disabled")}
        {Row("Two-Factor Authentication", profile.two_fa_enabled ? "Enabled" : "Disabled")}
      </Section>

      {/* Account Information */}
      <Section title="Account Information">
        {Row("Account Created", new Date(profile.created_at).toLocaleDateString())}
        {Row("Last Updated", new Date(profile.updated_at).toLocaleDateString())}
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
