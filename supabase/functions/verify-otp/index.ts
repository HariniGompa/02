import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  userId: string;
  otp: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, otp }: VerifyOTPRequest = await req.json();

    if (!userId || !otp) {
      throw new Error("Missing required fields");
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      throw new Error("Invalid OTP format");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the most recent unverified OTP for this user
    const { data: otpRecords, error: fetchError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    if (!otpRecords || otpRecords.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No OTP found. Please request a new one." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const otpRecord = otpRecords[0];

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, message: "OTP has expired. Please request a new one." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify OTP (server-side comparison)
    if (otpRecord.otp_code !== otp) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid OTP. Please try again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    if (updateError) throw updateError;

    // Update user's 2FA status
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ two_fa_enabled: true })
      .eq("id", userId);

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({ success: true, message: "2FA enabled successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
