-- Enable Supabase Realtime on sporocila table
-- Required for ConversationList and useRealtimeSporocila hook to receive live updates.
-- The original migration (20260315_sporocila.sql) had this line commented out.

ALTER PUBLICATION supabase_realtime ADD TABLE sporocila;
