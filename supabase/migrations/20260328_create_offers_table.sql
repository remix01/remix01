-- Service catalog offers (predefined offerings by obrtniks)
-- Separate from `ponudbe` which are bids on specific tasks (povpraševanja).
-- Obrtniks use this as a price list / service catalog visible to customers.

CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC,
  duration TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Obrtnik can manage their own offers
CREATE POLICY "obrtnik_own_offers" ON public.offers
  FOR ALL
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

-- Customers can read active offers
CREATE POLICY "public_read_active_offers" ON public.offers
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Admin full access
CREATE POLICY "admin_full_offers" ON public.offers
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_offers_partner ON public.offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_category ON public.offers(category);
