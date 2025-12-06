import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ConfirmEmail() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleConfirmation = async () => {
      // Parse token + type from URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const type = params.get("type");

      if (!token || !type) {
        return navigate("/login");
      }

      // Exchange token for a session
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (error) {
        console.error("Email confirmation error:", error);
        return navigate("/login");
      }

      // SUCCESS — user is now logged in
      navigate("/chatbot");
    };

    handleConfirmation();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen text-xl">
      Confirming your email...
    </div>
  );
}