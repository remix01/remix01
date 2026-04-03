-- Add 'draft' status to ponudbe table
-- This allows storing draft offers that partners can review before sending

ALTER TABLE public.ponudbe
DROP CONSTRAINT "ponudbe_status_check",
ADD CONSTRAINT "ponudbe_status_check" CHECK (status IN ('draft', 'poslana', 'sprejeta', 'zavrnjena'));

-- Update default comment
COMMENT ON COLUMN public.ponudbe.status IS 'Status: draft (not sent), poslana (sent), sprejeta (accepted), zavrnjena (rejected)';
