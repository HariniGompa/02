import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Send, Mic, Upload, User, Bot, Loader2, 
  FileText, LogOut, Download, LogIn, Speaker 
} from "lucide-react";
import { OTPVerification } from "@/components/OTPVerification";
import { ChatHistory } from "@/components/ChatHistory";
import { generatePDFReport } from "@/utils/pdfGenerator";

// Browser Speech Recognition setup
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

let recognition: any = null;

if (typeof window !== 'undefined') {
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  voice?: boolean; // message-level speaker toggle
}

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your loan eligibility assistant. I can help you check your loan eligibility. You can type your information, use voice input, or upload documents. How would you like to proceed?",
      timestamp: new Date(),
      voice: true,
    }
  ]);

  // Add saveMessages function
  const saveMessages = async (newMessages: Message[]) => {
    if (!currentConversationId || !user?.id) return;
    
    try {
      const messagesToSave = newMessages.map(msg => ({
        id: crypto.randomUUID(),
        conversation_id: currentConversationId,
        user_id: user.id,
        role: msg.role,
        content: msg.content,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('chat_messages')
        .insert(messagesToSave)
        .select();

      if (error) throw error;
      
    } catch (error) {
      console.error('Error saving messages:', error);
      toast({
        title: "Error",
        description: "Failed to save conversation",
        variant: "destructive"
      });
    }
  };
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [lastPrediction, setLastPrediction] = useState<any>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [downloadAfterVerification, setDownloadAfterVerification] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true); // Head speaker
  const [chatbotSessionId] = useState<string>(() => uuidv4());
  const navigate = useNavigate();
  const { toast } = useToast();

  // Voice recognition
  const startListening = () => {
    if (!recognition) return;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      toast({ title: "Error", description: "Cannot start voice input", variant: "destructive" });
      return;
    }
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setListening(false);
      toast({ title: "Error", description: `Speech recognition failed: ${event.error}`, variant: "destructive" });
    };
  };
  const stopListening = () => { if (recognition) recognition.stop(); setListening(false); };
  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    listening ? stopListening() : startListening();
  };

  // TTS for messages
  const speakMessage = (text: string) => {
    if (!voiceOutputEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1; utterance.pitch = 1; utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !SpeechRecognition) {
      toast({ title: "Speech Recognition not supported", description: "Your browser does not support voice input", variant: "destructive" });
    }
  }, [toast]);

  // Load user, profile, previous prediction
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(profileData);
        await loadOrCreateConversation(user.id);
      }
    };
    getUser();

    const storedPrediction = localStorage.getItem("prediction_result");
    if (storedPrediction) {
      try {
        const prediction = JSON.parse(storedPrediction);
        setLastPrediction(prediction);
        const resultMessage: Message = {
          role: "assistant",
          content: formatPredictionResult(prediction),
          timestamp: new Date(),
          voice: true,
        };
        setMessages(prev => [...prev, resultMessage]);
        localStorage.removeItem("prediction_result");
      } catch { }
    }
  }, []);

  const loadOrCreateConversation = async (userId: string) => {
    const { data: conversations } = await supabase.from("chat_conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1);
    if (conversations && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
      await loadMessages(conversations[0].id);
    } else await createNewConversation(userId);
  };
  const createNewConversation = async (userId: string) => {
    const { data } = await supabase.from("chat_conversations").insert({ user_id: userId, title: "New Chat" }).select().single();
    if (data) {
      setCurrentConversationId(data.id);
      setMessages([{ role: "assistant", content: "Hello! I'm your loan eligibility assistant. Let's begin!", timestamp: new Date(), voice: true }]);
    }
  };
  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase.from("chat_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    if (data) {
      setMessages(data.map(msg => ({
        role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        voice: true,
      })));
    }
  };
  const saveMessage = async (message: Message) => {
    if (!currentConversationId || !user) return;
    await supabase.from("chat_messages").insert({ conversation_id: currentConversationId, role: message.role, content: message.content });
    await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", currentConversationId);
  };

  const formatPredictionResult = (prediction: any) => {
    const eligible = prediction.eligible ? "✅ Eligible" : "❌ Not Eligible";
    const probability = `Probability: ${(prediction.probability * 100).toFixed(1)}%`;
    const reason = prediction.reason || "Based on your financial profile.";
    const suggestions = prediction.recommendations?.length
      ? `\n\nSuggestions:\n${prediction.recommendations
          .map((s: string, i: number) => `${i + 1}. ${s}`)
          .join("\n")}`
      : "";
    return `${eligible}\n${probability}\n\nReason: ${reason}${suggestions}`;
  };

  // ---------- FastAPI Chatbot Integration ----------
  const sendMessageToBackend = async (message: string) => {
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const params = new URLSearchParams({ session_id: chatbotSessionId });
      if (message.trim()) {
        params.append("answer", message.trim());
      }

      const response = await fetch(`${baseUrl}/chatbot-form?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "in_progress" && data.question) {
        const botMessage: Message = {
          role: "assistant",
          content: data.question,
          timestamp: new Date(),
          voice: true,
        };
        setMessages((prev) => [...prev, botMessage]);
        await saveMessage(botMessage);
        speakMessage(botMessage.content);
      } else if (data.status === "completed") {
        const summary = `Eligibility: ${data.eligibility === "eligible" ? "✅ Eligible" : "❌ Not Eligible"}\n` +
          `Probability: ${(data.probability * 100).toFixed(1)}%` +
          (data.reasons?.length ? `\n\nReasons:\n- ${data.reasons.join("\n- ")}` : "");

        const botMessage: Message = {
          role: "assistant",
          content: summary,
          timestamp: new Date(),
          voice: true,
        };
        setMessages((prev) => [...prev, botMessage]);
        await saveMessage(botMessage);
        speakMessage(botMessage.content);

        const prediction = {
          eligible: data.eligibility === "eligible",
          probability: data.probability,
          reason: data.reasons?.join(", ") || "",
          recommendations: [],
          report_url: data.report_url,
        };
        setLastPrediction(prediction);
        localStorage.setItem("prediction_result", JSON.stringify(prediction));
      }
    } catch (error) {
      console.error("Backend chatbot error:", error);
      toast({ title: "Error", description: "Failed to get response from backend", variant: "destructive" });
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const userMessage: Message = { role: "user", content: input, timestamp: new Date(), voice: true };
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(userMessage);
    const messageToSend = input;
    setInput(""); setLoading(true);
    await sendMessageToBackend(messageToSend);
    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); toast({ title: "Logged out", description: "You have been logged out successfully" }); navigate("/"); };
  const handleDownloadPDF = () => { if (!lastPrediction) { toast({ title: "No Report Available", description: "Complete a loan check first", variant: "destructive" }); return; } generatePDFReport(lastPrediction, user?.email || "guest@example.com"); };

  const profileIconColor = profile?.two_fa_enabled ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
  const profileBgClass = profile?.two_fa_enabled ? "bg-green-600 text-white" : "bg-red-600 text-white";

  if (showOTPVerification && user) {
    return (
      <div className="min-h-screen bg-gradient-accent flex items-center justify-center p-4">
        <OTPVerification
          userId={user.id}
          email={user.email || ""}
          onVerified={() => {
            setShowOTPVerification(false);
            setProfile({ ...profile, two_fa_enabled: true });
            if (downloadAfterVerification) { setDownloadAfterVerification(false); setTimeout(() => handleDownloadPDF(), 100); }
          }}
          onCancel={() => { setShowOTPVerification(false); setDownloadAfterVerification(false); }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-accent flex">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r p-4 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="w-full justify-start">
          <ArrowLeft className="mr-2 h-4 w-4" /> Home
        </Button>
        <Button className="w-full" onClick={() => navigate("/manual-form")}>
          <FileText className="mr-2 h-4 w-4" /> Manual Form
        </Button>
        <Button className="w-full" onClick={() => user && createNewConversation(user.id)}>New Chat</Button>
        <div className="pt-4">
          <ChatHistory
            userId={user?.id || null}
            currentConversationId={currentConversationId}
            onSelectConversation={async (convId) => { setCurrentConversationId(convId); await loadMessages(convId); }}
            onNewChat={() => user && createNewConversation(user.id)}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
          <h1 className="text-xl font-bold">Loan Eligibility Chat</h1>
          <div className="flex items-center gap-2">
            {lastPrediction && user && (
              <>
                {profile?.two_fa_enabled ? (
                  <Button variant="outline" size="icon" onClick={handleDownloadPDF} title="Download PDF">
                    <Download className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" onClick={() => setShowConsentDialog(true)} title="Download PDF">
                    <Download className="h-5 w-5" />
                  </Button>
                )}
              </>
            )}
            {!user && <Button variant="ghost" size="icon" onClick={() => navigate("/login")}><LogIn className="h-5 w-5" /></Button>}
            {user && <>
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className={`rounded-full border-2 ${profileIconColor} ${profileBgClass}`}><User className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5" /></Button>
            </>}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message, i) => (
              <div key={i} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><Bot className="h-5 w-5 text-primary-foreground" /></div>}
                <Card className={`p-4 max-w-[70%] ${message.role==="user" ? "gradient-primary text-primary-foreground":"gradient-card"} flex items-center justify-between`}>
                  <p className="whitespace-pre-wrap flex-1">{message.content}</p>
                  {message.role === "assistant" && (
                    <Button variant="ghost" size="icon" onClick={() => { message.voice = !message.voice; if(message.voice) speakMessage(message.content); }}>
                      <Speaker className={`h-4 w-4 ${message.voice?"text-green-500":"text-gray-400"}`} />
                    </Button>
                  )}
                </Card>
                {message.role === "user" && <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center"><User className="h-5 w-5 text-accent-foreground" /></div>}
              </div>
            ))}
            {loading && <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><Bot className="h-5 w-5 text-primary-foreground" /></div><Card className="p-4 gradient-card"><Loader2 className="h-5 w-5 animate-spin" /></Card></div>}
          </div>
        </ScrollArea>

        {/* Input (floating at bottom) */}
        <div className="border-t bg-card p-4 sticky bottom-0 z-50">
          <div className="max-w-3xl mx-auto flex gap-2">
            <label>
              <Button variant="outline" size="icon" asChild disabled={!user}>
                <span>
                  <Upload className="h-5 w-5"/>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      // Check file size (max 10MB)
                      if (file.size > 10 * 1024 * 1024) {
                        toast({
                          title: "File too large",
                          description: "Maximum file size is 10MB",
                          variant: "destructive"
                        });
                        return;
                      }

                      const formData = new FormData();
                      formData.append('file', file);

                      try {
                        setLoading(true);
                        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/extract/run`, {
                          method: 'POST',
                          body: formData,
                          headers: {
                            'Accept': 'application/json',
                          }
                        });

                        if (!response.ok) {
                          throw new Error('Failed to process document');
                        }

                        const data = await response.json();
                        
                        // Add user message
                        const userMsg: Message = {
                          role: 'user',
                          content: `Uploaded document: ${file.name}`,
                          timestamp: new Date()
                        };
                        
                        // Add assistant response
                        const assistantMsg: Message = {
                          role: 'assistant',
                          content: `I've analyzed your document. Here's what I found:\n\n` +
                            `- Loan Amount: $${data.extracted_features.loan_amount || 'N/A'}\n` +
                            `- Annual Salary: $${data.extracted_features.annual_salary || 'N/A'}\n` +
                            `- Loan Eligibility: ${data.eligible ? '✅ Approved' : '❌ Not Approved'}\n` +
                            `- Confidence: ${(data.probability * 100).toFixed(1)}%\n\n` +
                            `Would you like to proceed with this information?`,
                          timestamp: new Date(),
                          voice: true
                        };

                        setMessages(prev => [...prev, userMsg, assistantMsg]);
                        speakMessage(assistantMsg.content);
                        
                        // Save to conversation if user is logged in
                        if (currentConversationId) {
                          await saveMessages([userMsg, assistantMsg]);
                        }

                      } catch (error) {
                        console.error('Error processing document:', error);
                        toast({
                          title: "Error",
                          description: "Failed to process document. Please try again.",
                          variant: "destructive"
                        });
                      } finally {
                        setLoading(false);
                        // Reset file input
                        if (e.target) {
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </span>
              </Button>
            </label>
            <Input placeholder="Type your message..." value={input} onChange={(e)=>setInput(e.target.value)} onKeyPress={(e)=>e.key==="Enter" && handleSend()} className="flex-1"/>
            <Button variant={listening?"secondary":"outline"} size="icon" onClick={(e) => toggleListening(e)} disabled={!SpeechRecognition}><Mic className={`h-5 w-5 ${listening?"animate-pulse":""}`}/></Button>
            <Button variant={voiceOutputEnabled?"secondary":"outline"} size="icon" onClick={()=>setVoiceOutputEnabled(!voiceOutputEnabled)}><Speaker className="h-5 w-5"/></Button>
            <Button onClick={handleSend} disabled={loading || !input.trim()}><Send className="h-5 w-5"/></Button>
          </div>
        </div>
      </div>

      {/* Consent Dialog */}
      <AlertDialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <AlertDialogTrigger asChild><span /></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verification Required</AlertDialogTitle>
            <AlertDialogDescription>To download your loan eligibility report, we need to verify your identity via a one-time email code. Would you like to proceed?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={()=>setShowConsentDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={()=>{
              setShowConsentDialog(false); setDownloadAfterVerification(true); setShowOTPVerification(true);
            }}>Verify & Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Chatbot;