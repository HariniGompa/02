import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Mic, Upload, User, Bot, Loader2, FileText, LogOut, Download } from "lucide-react";
import { sendToMLBackend } from "@/services/api";
import { OTPVerification } from "@/components/OTPVerification";
import { ChatHistory } from "@/components/ChatHistory";
import { generatePDFReport } from "@/utils/pdfGenerator";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your loan eligibility assistant. I can help you check your loan eligibility. You can type your information, use voice input, or upload documents. How would you like to proceed?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [lastPrediction, setLastPrediction] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(profileData);

        // Create or load conversation
        await loadOrCreateConversation(user.id);
      }
    };

    getUser();

    // Check for prediction result from manual form
    const storedPrediction = localStorage.getItem("prediction_result");
    if (storedPrediction) {
      try {
        const prediction = JSON.parse(storedPrediction);
        setLastPrediction(prediction);
        const resultMessage: Message = {
          role: "assistant",
          content: formatPredictionResult(prediction),
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, resultMessage]);
        localStorage.removeItem("prediction_result");
      } catch (error) {
        console.error("Error parsing prediction result:", error);
      }
    }
  }, []);

  const loadOrCreateConversation = async (userId: string) => {
    // Get most recent conversation
    const { data: conversations } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (conversations && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
      await loadMessages(conversations[0].id);
    } else {
      // Create new conversation
      await createNewConversation(userId);
    }
  };

  const createNewConversation = async (userId: string) => {
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: userId,
        title: "New Chat",
      })
      .select()
      .single();

    if (!error && data) {
      setCurrentConversationId(data.id);
      setMessages([{
        role: "assistant",
        content: "Hello! I'm your loan eligibility assistant. I can help you check your loan eligibility. You can type your information, use voice input, or upload documents. How would you like to proceed?",
        timestamp: new Date(),
      }]);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at),
      })));
    }
  };

  const saveMessage = async (message: Message) => {
    if (!currentConversationId || !user) return;

    await supabase.from("chat_messages").insert({
      conversation_id: currentConversationId,
      role: message.role,
      content: message.content,
    });

    // Update conversation's updated_at
    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", currentConversationId);
  };

  const formatPredictionResult = (prediction: any) => {
    const eligible = prediction.eligible ? "✅ Eligible" : "❌ Not Eligible";
    const probability = `Probability: ${(prediction.probability * 100).toFixed(1)}%`;
    const reason = prediction.reason || "Based on your financial profile and credit history.";
    const suggestions = prediction.recommendations?.length 
      ? `\n\nSuggestions:\n${prediction.recommendations.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`
      : "";
    
    return `${eligible}\n${probability}\n\nReason: ${reason}${suggestions}`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    await saveMessage(userMessage);
    setInput("");
    setLoading(true);

    try {
      const assistantMessage: Message = {
        role: "assistant",
        content: "Thank you for providing that information. To give you an accurate loan eligibility prediction, I'll need some specific details. Could you provide:\n\n• Your annual salary\n• Savings balance\n• Loan amount needed\n• Loan purpose\n• Employment type\n\nOr you can use the Manual Form for a complete assessment.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(assistantMessage);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/");
  };

  const handleDownloadPDF = () => {
    if (!lastPrediction) {
      toast({
        title: "No Report Available",
        description: "Complete a loan eligibility check first to generate a report",
        variant: "destructive",
      });
      return;
    }

    generatePDFReport(lastPrediction, user?.email || "guest@example.com");
    toast({
      title: "Report Downloaded",
      description: "Your loan eligibility report has been downloaded",
    });
  };

  const handleVoiceInput = () => {
    toast({
      title: "Voice Input",
      description: "Voice input feature coming soon!",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to upload documents.",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.two_fa_enabled) {
      setShowOTPVerification(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Only images (JPG, PNG, WEBP), PDFs, and DOCX files are allowed.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "File Upload",
      description: "Document processing feature coming soon!",
    });
  };

  const profileIconColor = profile?.two_fa_enabled 
    ? "border-green-500 bg-green-50" 
    : "border-red-500 bg-red-50";

  if (showOTPVerification && user) {
    return (
      <div className="min-h-screen bg-gradient-accent flex items-center justify-center p-4">
        <OTPVerification
          userId={user.id}
          email={user.email || ""}
          onVerified={() => {
            setShowOTPVerification(false);
            setProfile({ ...profile, two_fa_enabled: true });
            toast({
              title: "2FA Enabled",
              description: "You can now upload documents",
            });
          }}
          onCancel={() => setShowOTPVerification(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-accent flex">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r p-4 space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="w-full justify-start"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Home
        </Button>

        <Button 
          className="w-full" 
          onClick={() => navigate("/manual-form")}
        >
          <FileText className="mr-2 h-4 w-4" />
          Manual Form
        </Button>

        <Button 
          className="w-full" 
          onClick={() => user && createNewConversation(user.id)}
        >
          New Chat
        </Button>

        <div className="pt-4">
          <ChatHistory
            userId={user?.id || null}
            currentConversationId={currentConversationId}
            onSelectConversation={async (convId) => {
              setCurrentConversationId(convId);
              await loadMessages(convId);
            }}
            onNewChat={() => user && createNewConversation(user.id)}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Loan Eligibility Chat</h1>
          <div className="flex items-center gap-2">
            {lastPrediction && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownloadPDF}
                title="Download PDF Report"
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
            {user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-full border-2 ${profileIconColor}`}
                  onClick={() => navigate("/profile")}
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <Card className={`p-4 max-w-[70%] ${
                  message.role === "user" ? "gradient-primary text-primary-foreground" : "gradient-card"
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </Card>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <Card className="p-4 gradient-card">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-card p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleVoiceInput}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <label>
              <Button
                variant="outline"
                size="icon"
                asChild
                disabled={!user}
              >
                <span>
                  <Upload className="h-5 w-5" />
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </span>
              </Button>
            </label>
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;