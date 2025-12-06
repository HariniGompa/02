-- Create chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create OTP verification table
CREATE TABLE public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view own conversations"
ON public.chat_conversations
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create own conversations"
ON public.chat_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own conversations"
ON public.chat_conversations
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own conversations"
ON public.chat_conversations
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = conversation_id
    AND (user_id = auth.uid() OR user_id IS NULL)
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = conversation_id
    AND (user_id = auth.uid() OR user_id IS NULL)
  )
);

CREATE POLICY "Users can delete messages in their conversations"
ON public.chat_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = conversation_id
    AND user_id = auth.uid()
  )
);

-- RLS Policies for otp_verifications
CREATE POLICY "Users can view own OTP"
ON public.otp_verifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own OTP"
ON public.otp_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OTP"
ON public.otp_verifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_otp_verifications_user_id ON public.otp_verifications(user_id);
CREATE INDEX idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);

-- Create trigger for updating updated_at
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();