import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Shield } from "lucide-react";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        setPhoneNumber(profileData.phone_number || "");
      }
    };

    getUser();
  }, [navigate]);

  const handleToggle2FA = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ two_fa_enabled: enabled })
        .eq("id", user.id);

      if (error) throw error;

      setProfile({ ...profile, two_fa_enabled: enabled });
      toast({
        title: enabled ? "2FA Enabled" : "2FA Disabled",
        description: enabled 
          ? "Two-factor authentication is now active" 
          : "Two-factor authentication has been disabled",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePhone = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone_number: phoneNumber })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Phone number updated",
        description: "Your phone number has been saved",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-accent p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/chatbot")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chatbot
        </Button>

        <Card className="p-8 gradient-card animate-scale-in">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 mx-auto rounded-full border-4 flex items-center justify-center mb-4 ${
              profile.two_fa_enabled ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
            }`}>
              <Shield className={`h-10 w-10 ${profile.two_fa_enabled ? "text-green-500" : "text-red-500"}`} />
            </div>
            <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={profile.username || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (for SMS 2FA)</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <Button onClick={handleUpdatePhone} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Two-Factor Authentication</h3>
                  <p className="text-sm text-muted-foreground">
                    {profile.two_fa_enabled 
                      ? "Your account is protected with 2FA" 
                      : "Enable 2FA for enhanced security (required for document uploads)"}
                  </p>
                </div>
                <Switch
                  checked={profile.two_fa_enabled}
                  onCheckedChange={handleToggle2FA}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground text-center">
                Status: {profile.two_fa_enabled 
                  ? "✅ 2FA Active - Full access to all features" 
                  : "⚠️ 2FA Inactive - Document upload restricted"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;