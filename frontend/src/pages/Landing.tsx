import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Shield, Zap, BarChart3, FileText, Users, Lock } from "lucide-react";
import logo from "@/assets/loanadvisor-logo.png";
const Landing = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-gradient-accent">
      {/* Header Bar */}
      <div className="text-primary-foreground py-4 shadow-md bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            
            <h1 className="text-2xl font-bold text-slate-950">LoanAdvisor AI</h1>
          </div>
        </div>
      </div>
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-sky-950">AI-Powered Loan Eligibility Advisory System</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Get instant loan eligibility predictions powered by advanced machine learning. 
            Make informed financial decisions with AI-driven insights.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/login")} className="shadow-glow hover:scale-105 transition-smooth">
              Login / Signup
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/chatbot")}>
              Continue as Guest
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate("/admin/login")}>
              <Lock className="mr-2 h-5 w-5" />
              Admin Login
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="p-6 gradient-card hover:shadow-lg transition-smooth animate-fade-in">
            <Shield className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">
              Your data is encrypted and protected with 2FA authentication
            </p>
          </Card>

          <Card className="p-6 gradient-card hover:shadow-lg transition-smooth animate-fade-in" style={{
          animationDelay: "0.1s"
        }}>
            <Zap className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Instant Results</h3>
            <p className="text-muted-foreground">
              Get loan eligibility predictions in seconds with AI analysis
            </p>
          </Card>

          <Card className="p-6 gradient-card hover:shadow-lg transition-smooth animate-fade-in" style={{
          animationDelay: "0.2s"
        }}>
            <BarChart3 className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">AI Explanations</h3>
            <p className="text-muted-foreground">
              Understand predictions with SHAP visualizations and recommendations
            </p>
          </Card>
        </div>

        {/* How to Use Section */}
        <Card className="p-8 mb-16 gradient-card">
          <h2 className="text-3xl font-bold mb-6 text-center">How to Use</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold mb-1">Create Account or Use Guest Mode</h4>
                  <p className="text-muted-foreground">Sign up for full features or continue as guest for quick access</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold mb-1">Choose Input Method</h4>
                  <p className="text-muted-foreground">Use the chatbot, manual form, or upload documents (requires 2FA)</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold mb-1">Get AI Prediction</h4>
                  <p className="text-muted-foreground">Receive eligibility status with probability score and explanations</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-bold mb-1">Get Recommendations</h4>
                  <p className="text-muted-foreground">If not eligible, receive actionable suggestions to improve your chances</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Developer Info Section */}
        <Card className="p-8 gradient-card">
          <h2 className="text-3xl font-bold mb-6 text-center">About the Project</h2>
          <div className="max-w-3xl mx-auto space-y-4 text-center">
            <p className="text-muted-foreground">
              This system is an academic project demonstrating the application of artificial intelligence
              in financial technology. It uses advanced machine learning models to predict loan eligibility
              based on multiple financial and personal factors.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-8 w-8 text-primary" />
                <span className="font-semibold">Multiple Input Methods</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                <span className="font-semibold">User & Admin Portals</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Lock className="h-8 w-8 text-primary" />
                <span className="font-semibold">Secure 2FA System</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>;
};
export default Landing;