import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck } from "lucide-react";

interface OTPVerificationProps {
  userId: string;
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}

export const OTPVerification = ({ userId, email, onVerified, onCancel }: OTPVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const { toast } = useToast();

  useEffect(() => {
    // Send OTP automatically when component mounts
    sendOTP();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const sendOTP = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp-email", {
        body: { email, userId },
      });

      if (error) throw error;

      toast({
        title: "OTP Sent",
        description: `A 6-digit code has been sent to ${email}`,
      });
      setTimeLeft(300); // Reset timer
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { userId, otp },
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.message);
      }

      toast({
        title: "Verified!",
        description: "2FA has been enabled successfully",
      });

      onVerified();
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="p-6 max-w-md mx-auto gradient-card">
      <div className="text-center mb-6">
        <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Email OTP Verification</h2>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to {email}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Time remaining: <span className="font-bold">{formatTime(timeLeft)}</span>
        </p>
      </div>

      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          className="text-center text-2xl tracking-widest"
        />

        <div className="flex gap-2">
          <Button
            onClick={verifyOTP}
            disabled={loading || otp.length !== 6}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={sendOTP}
          disabled={sending || timeLeft > 240} // Can resend after 1 minute
          className="w-full"
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Resend OTP"
          )}
        </Button>
      </div>
    </Card>
  );
};
