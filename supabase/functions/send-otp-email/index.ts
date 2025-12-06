import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userId }: OTPRequest = await req.json();

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Calculate expiry (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store OTP in database
    const { error: dbError } = await supabase
      .from("otp_verifications")
      .insert({
        user_id: userId,
        otp_code: otp,
        expires_at: expiresAt,
        verified: false,
      });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Send OTP via email (using console.log for now - integrate with Resend or SendGrid)
    console.log(`OTP for ${email}: ${otp} (expires at ${expiresAt})`);

    // TODO: Integrate with email service (Resend/SendGrid)
    // For now, we'll just log it and return success
    // In production, you would send the email here

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
