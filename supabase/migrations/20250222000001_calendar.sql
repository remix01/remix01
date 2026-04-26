-- Create calendar_connections table
CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expiry_date bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ponudba_id uuid REFERENCES ponudbe(id) ON DELETE CASCADE NOT NULL,
  narocnik_id uuid REFERENCES profiles(id),
  obrtnik_id uuid REFERENCES obrtnik_profiles(id),
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  narocnik_calendar_event_id text,
  obrtnik_calendar_event_id text,
  status text DEFAULT 'scheduled' 
    CHECK (status IN ('scheduled','completed','cancelled')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(ponudba_id)
);

-- Enable RLS
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_connections
CREATE POLICY "Users manage own calendar connection"
ON public.calendar_connections FOR ALL
USING (user_id = auth.uid());

-- RLS policies for appointments
CREATE POLICY "Participants can read own appointments"
ON public.appointments FOR SELECT
USING (
  narocnik_id = auth.uid() OR 
  obrtnik_id = auth.uid()
);

-- Create indexes for performance
CREATE INDEX idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX idx_appointments_ponudba_id ON appointments(ponudba_id);
CREATE INDEX idx_appointments_narocnik_id ON appointments(narocnik_id);
CREATE INDEX idx_appointments_obrtnik_id ON appointments(obrtnik_id);
