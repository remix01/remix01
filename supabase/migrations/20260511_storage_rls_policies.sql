-- Storage RLS policies for LiftGO buckets
-- Buckets: chat-uploads (private), ai-generated (private), user-avatars (private)
-- Access via signed URLs only - no public bucket access

-- ============================================================
-- Create buckets (idempotent)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('user-avatars',   'user-avatars',   false, 2097152,   ARRAY['image/jpeg','image/png','image/webp']),
  ('chat-uploads',   'chat-uploads',   false, 10485760,  ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('ai-generated',   'ai-generated',   false, 10485760,  ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- user-avatars: each user manages only their own folder
-- ============================================================

CREATE POLICY "avatars_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- chat-uploads: sender can upload; both conversation parties can read
-- Files stored as: chat-uploads/{task_id}/{sender_id}/{filename}
-- ============================================================

CREATE POLICY "chat_uploads_insert_authenticated"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "chat_uploads_select_conversation_party"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-uploads'
    AND auth.role() = 'authenticated'
    AND (
      -- sender
      auth.uid()::text = (storage.foldername(name))[2]
      -- or task owner / assigned obrtnik
      OR EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND (t.customer_id = auth.uid() OR t.assigned_to = auth.uid())
      )
    )
  );

CREATE POLICY "chat_uploads_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-uploads'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- ============================================================
-- ai-generated: service role writes; owning user reads
-- Files stored as: ai-generated/{user_id}/{filename}
-- ============================================================

CREATE POLICY "ai_generated_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ai-generated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Insert/delete handled exclusively by service role (no anon/user policy needed)
