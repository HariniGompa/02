import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatHistoryProps {
  userId: string | null;
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const ChatHistory = ({ 
  userId, 
  currentConversationId, 
  onSelectConversation,
  onNewChat 
}: ChatHistoryProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId]);

  const loadConversations = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading conversations:", error);
      return;
    }

    setConversations(data || []);
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
      return;
    }

    setConversations(prev => prev.filter(c => c.id !== conversationId));
    
    if (conversationId === currentConversationId) {
      onNewChat();
    }

    toast({
      title: "Deleted",
      description: "Conversation deleted successfully",
    });
  };

  if (!userId) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Login to save chat history
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">
        Chat History
      </h3>
      <ScrollArea className="h-[400px]">
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2">No previous chats</p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors ${
                  conv.id === currentConversationId ? "bg-accent" : ""
                }`}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <button
                  onClick={() => onSelectConversation(conv.id)}
                  className="flex-1 text-left text-sm truncate"
                >
                  {conv.title}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
