-- Fix chat_conversations RLS to deny anonymous access explicitly
DROP POLICY IF EXISTS "Users can view their own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON chat_conversations;

-- Create improved policies that explicitly deny anonymous access
CREATE POLICY "Authenticated users can view their own conversations"
ON chat_conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create their own conversations"
ON chat_conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own conversations"
ON chat_conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own conversations"
ON chat_conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Explicitly deny all access to anonymous role
CREATE POLICY "Deny anonymous access to conversations"
ON chat_conversations
TO anon
USING (false);