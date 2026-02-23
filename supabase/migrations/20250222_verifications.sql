-- Add AJPES verification columns to obrtnik_profiles
ALTER TABLE public.obrtnik_profiles
ADD COLUMN IF NOT EXISTS ajpes_id text,
ADD COLUMN IF NOT EXISTS ajpes_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS ajpes_data jsonb;

-- Create verifications table for manual review queue
CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obrtnik_id uuid REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  ajpes_id text,
  ajpes_response jsonb,
  status text DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  
  -- Indexes
  UNIQUE(obrtnik_id, created_at)
);

-- Enable RLS on verifications table
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- Admin-only access to verifications
CREATE POLICY "Admin can view and manage verifications"
ON public.verifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id = auth.uid() AND admin_users.aktiven = true
  )
);

-- Create index for faster queries
CREATE INDEX idx_verifications_status ON public.verifications(status);
CREATE INDEX idx_verifications_obrtnik_id ON public.verifications(obrtnik_id);
CREATE INDEX idx_verifications_created_at ON public.verifications(created_at DESC);
