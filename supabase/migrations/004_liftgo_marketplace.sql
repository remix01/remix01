-- LiftGO Marketplace Migration
-- Creates tables for naročniki, obrtniki, povpraševanja, ponudbe, and ocene

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('narocnik', 'obrtnik')),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  location_city TEXT,
  location_region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_city ON public.profiles(location_city);

-- ============================================================================
-- OBRTNIK PROFILES TABLE
-- ============================================================================
CREATE TABLE public.obrtnik_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  description TEXT,
  ajpes_id TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  avg_rating NUMERIC(3,2) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  response_time_hours INTEGER,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for obrtnik_profiles
ALTER TABLE public.obrtnik_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verified obrtnik profiles"
  ON public.obrtnik_profiles
  FOR SELECT
  USING (is_verified = true);

CREATE POLICY "Obrtniki can insert own profile"
  ON public.obrtnik_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'obrtnik'
    )
  );

CREATE POLICY "Obrtniki can update own profile"
  ON public.obrtnik_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Indexes
CREATE INDEX idx_obrtnik_verified ON public.obrtnik_profiles(is_verified);
CREATE INDEX idx_obrtnik_available ON public.obrtnik_profiles(is_available);
CREATE INDEX idx_obrtnik_rating ON public.obrtnik_profiles(avg_rating DESC);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon_name TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active categories"
  ON public.categories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage categories"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = auth.uid() AND aktiven = true
    )
  );

-- Index
CREATE INDEX idx_categories_active ON public.categories(is_active, sort_order);

-- ============================================================================
-- OBRTNIK CATEGORIES TABLE
-- ============================================================================
CREATE TABLE public.obrtnik_categories (
  obrtnik_id UUID REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (obrtnik_id, category_id)
);

-- RLS for obrtnik_categories
ALTER TABLE public.obrtnik_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read obrtnik categories"
  ON public.obrtnik_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Obrtniki can manage own categories"
  ON public.obrtnik_categories
  FOR ALL
  TO authenticated
  USING (auth.uid() = obrtnik_id)
  WITH CHECK (auth.uid() = obrtnik_id);

-- Indexes
CREATE INDEX idx_obrtnik_categories_obrtnik ON public.obrtnik_categories(obrtnik_id);
CREATE INDEX idx_obrtnik_categories_category ON public.obrtnik_categories(category_id);

-- ============================================================================
-- POVPRASEVANJA TABLE
-- ============================================================================
CREATE TABLE public.povprasevanja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narocnik_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_region TEXT,
  location_notes TEXT,
  urgency TEXT NOT NULL DEFAULT 'normalno' CHECK (urgency IN ('normalno', 'kmalu', 'nujno')),
  preferred_date_from DATE,
  preferred_date_to DATE,
  budget_min NUMERIC,
  budget_max NUMERIC,
  status TEXT NOT NULL DEFAULT 'odprto' CHECK (status IN ('odprto', 'v_teku', 'zakljuceno', 'preklicano')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for povprasevanja
ALTER TABLE public.povprasevanja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Narocniki see own povprasevanja"
  ON public.povprasevanja
  FOR SELECT
  TO authenticated
  USING (
    narocnik_id = auth.uid() OR
    (status = 'odprto' AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'obrtnik'
    )) OR
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = auth.uid() AND aktiven = true
    )
  );

CREATE POLICY "Narocniki can create povprasevanja"
  ON public.povprasevanja
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = narocnik_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'narocnik'
    )
  );

CREATE POLICY "Narocniki can update own povprasevanja"
  ON public.povprasevanja
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = narocnik_id);

-- Indexes
CREATE INDEX idx_povprasevanja_narocnik ON public.povprasevanja(narocnik_id);
CREATE INDEX idx_povprasevanja_category ON public.povprasevanja(category_id);
CREATE INDEX idx_povprasevanja_status ON public.povprasevanja(status);
CREATE INDEX idx_povprasevanja_city ON public.povprasevanja(location_city);
CREATE INDEX idx_povprasevanja_created ON public.povprasevanja(created_at DESC);

-- ============================================================================
-- PONUDBE TABLE
-- ============================================================================
CREATE TABLE public.ponudbe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  povprasevanje_id UUID NOT NULL REFERENCES public.povprasevanja(id) ON DELETE CASCADE,
  obrtnik_id UUID NOT NULL REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  price_estimate NUMERIC,
  price_type TEXT NOT NULL DEFAULT 'ocena' CHECK (price_type IN ('fiksna', 'ocena', 'po_ogledu')),
  available_date DATE,
  status TEXT NOT NULL DEFAULT 'poslana' CHECK (status IN ('poslana', 'sprejeta', 'zavrnjena')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (povprasevanje_id, obrtnik_id)
);

-- RLS for ponudbe
ALTER TABLE public.ponudbe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Obrtniki see own ponudbe"
  ON public.ponudbe
  FOR SELECT
  TO authenticated
  USING (
    obrtnik_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.povprasevanja
      WHERE id = ponudbe.povprasevanje_id AND narocnik_id = auth.uid()
    )
  );

CREATE POLICY "Obrtniki can create ponudbe"
  ON public.ponudbe
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = obrtnik_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'obrtnik'
    )
  );

CREATE POLICY "Narocniki can update ponudbe status"
  ON public.ponudbe
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.povprasevanja
      WHERE id = ponudbe.povprasevanje_id AND narocnik_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_ponudbe_povprasevanje ON public.ponudbe(povprasevanje_id);
CREATE INDEX idx_ponudbe_obrtnik ON public.ponudbe(obrtnik_id);
CREATE INDEX idx_ponudbe_status ON public.ponudbe(status);
CREATE INDEX idx_ponudbe_created ON public.ponudbe(created_at DESC);

-- ============================================================================
-- OCENE TABLE
-- ============================================================================
CREATE TABLE public.ocene (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ponudba_id UUID NOT NULL REFERENCES public.ponudbe(id) ON DELETE CASCADE UNIQUE,
  narocnik_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  obrtnik_id UUID NOT NULL REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for ocene
ALTER TABLE public.ocene ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public ocene"
  ON public.ocene
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Narocniki can create ocene"
  ON public.ocene
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = narocnik_id AND
    EXISTS (
      SELECT 1 FROM public.ponudbe
      JOIN public.povprasevanja ON povprasevanja.id = ponudbe.povprasevanje_id
      WHERE ponudbe.id = ponudba_id AND povprasevanja.narocnik_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_ocene_obrtnik ON public.ocene(obrtnik_id);
CREATE INDEX idx_ocene_ponudba ON public.ocene(ponudba_id);
CREATE INDEX idx_ocene_public ON public.ocene(is_public);
CREATE INDEX idx_ocene_created ON public.ocene(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on profiles
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- Update updated_at timestamp on povprasevanja
CREATE OR REPLACE FUNCTION public.update_povprasevanja_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_povprasevanja_updated_at
  BEFORE UPDATE ON public.povprasevanja
  FOR EACH ROW
  EXECUTE FUNCTION public.update_povprasevanja_updated_at();

-- Update obrtnik avg_rating and total_reviews when ocene is inserted/updated
CREATE OR REPLACE FUNCTION public.update_obrtnik_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.obrtnik_profiles
  SET 
    avg_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.ocene
      WHERE obrtnik_id = NEW.obrtnik_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.ocene
      WHERE obrtnik_id = NEW.obrtnik_id
    )
  WHERE id = NEW.obrtnik_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_obrtnik_rating_on_insert
  AFTER INSERT ON public.ocene
  FOR EACH ROW
  EXECUTE FUNCTION public.update_obrtnik_rating();

CREATE TRIGGER update_obrtnik_rating_on_update
  AFTER UPDATE ON public.ocene
  FOR EACH ROW
  EXECUTE FUNCTION public.update_obrtnik_rating();

-- ============================================================================
-- SEED CATEGORIES
-- ============================================================================
INSERT INTO public.categories (name, slug, icon_name, sort_order) VALUES
  ('Vodovodna dela', 'vodovodna-dela', 'Droplets', 1),
  ('Elektrika', 'elektrika', 'Zap', 2),
  ('Slikopleskarstvo', 'slikopleskarstvo', 'PaintBucket', 3),
  ('Tesarstvo', 'tesarstvo', 'Hammer', 4),
  ('Ključavničarstvo', 'kljucavnicarstvo', 'Lock', 5),
  ('Tlakovanje', 'tlakovanje', 'Square', 6),
  ('Fasaderstvo', 'fasaderstvo', 'Building', 7),
  ('Ogrevanje in klimatizacija', 'ogrevanje-klima', 'Thermometer', 8),
  ('Selitvene storitve', 'selitev', 'Truck', 9),
  ('Čiščenje', 'ciscenje', 'Sparkles', 10),
  ('Vrtnarstvo', 'vrtnarstvo', 'Flower', 11),
  ('Sanacija vlage', 'sanacija-vlage', 'Waves', 12),
  ('Strešna dela', 'stresna-dela', 'Home', 13),
  ('Keramičarska dela', 'keramika', 'Grid', 14),
  ('Pohištveni servis', 'pohistvo', 'Sofa', 15);

-- Grant permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.obrtnik_profiles TO authenticated;
GRANT SELECT ON public.categories TO authenticated, anon;
GRANT SELECT ON public.obrtnik_categories TO authenticated, anon;
GRANT SELECT ON public.povprasevanja TO authenticated;
GRANT SELECT ON public.ponudbe TO authenticated;
GRANT SELECT ON public.ocene TO authenticated, anon;

-- Comments
COMMENT ON TABLE public.profiles IS 'User profiles for both naročniki and obrtniki';
COMMENT ON TABLE public.obrtnik_profiles IS 'Extended profile information for obrtniki (craftworkers)';
COMMENT ON TABLE public.categories IS 'Service categories for LiftGO marketplace';
COMMENT ON TABLE public.povprasevanja IS 'Service requests from naročniki';
COMMENT ON TABLE public.ponudbe IS 'Offers from obrtniki on service requests';
COMMENT ON TABLE public.ocene IS 'Reviews from naročniki for obrtniki';
