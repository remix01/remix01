-- Direct messages between customers and craftsmen, scoped to a job request
-- Uses Supabase Realtime for live updates

CREATE TABLE IF NOT EXISTS sporocila (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  povprasevanje_id  UUID        NOT NULL REFERENCES povprasevanja(id) ON DELETE CASCADE,
  sender_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message           TEXT        NOT NULL,
  is_read           BOOLEAN     NOT NULL DEFAULT false,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sporocila_povprasevanje_id
  ON sporocila (povprasevanje_id, created_at);

CREATE INDEX IF NOT EXISTS idx_sporocila_receiver_unread
  ON sporocila (receiver_id, is_read)
  WHERE is_read = false;

-- RLS: participants of a conversation can read and write
ALTER TABLE sporocila ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sporocila_participants_select"
  ON sporocila FOR SELECT
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "sporocila_sender_insert"
  ON sporocila FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "sporocila_receiver_update_read"
  ON sporocila FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Enable Realtime on this table (run in Supabase dashboard or via CLI)
-- ALTER PUBLICATION supabase_realtime ADD TABLE sporocila;
