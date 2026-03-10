-- Marketplace Events Table
-- Tracks all marketplace lifecycle events: request created, matched, broadcast, instant offer, etc.
-- Used for audit trail, debugging, and analytics.

CREATE TABLE IF NOT EXISTS marketplace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'request_created',
      'matched',
      'broadcast_sent_matched',
      'broadcast_sent_deadline_warning',
      'broadcast_sent_offer_accepted',
      'instant_offer',
      'offer_accepted',
      'expired',
      'guarantee_activated'
    )
  ),
  request_id UUID NOT NULL REFERENCES povprasevanja(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES obrtnik_profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_marketplace_events_request_id 
  ON marketplace_events(request_id, created_at DESC);

CREATE INDEX idx_marketplace_events_partner_id 
  ON marketplace_events(partner_id, created_at DESC);

CREATE INDEX idx_marketplace_events_type 
  ON marketplace_events(event_type, created_at DESC);

-- Row-level security (service role only)
ALTER TABLE marketplace_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_events_service_only"
  ON marketplace_events
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add columns to obrtnik_profiles for instant offers
ALTER TABLE obrtnik_profiles
  ADD COLUMN IF NOT EXISTS enable_instant_offers BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS instant_offer_templates JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'START' CHECK (plan_type IN ('START', 'PRO'));

-- Add columns to ponudbe for auto-generated offers
ALTER TABLE ponudbe
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'poslana' CHECK (
    status IN ('draft', 'poslana', 'sprejeta', 'zavrnjena', 'preklicana')
  ),
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_id UUID;
