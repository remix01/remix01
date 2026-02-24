-- Create obrtniki (contractors) table
CREATE TABLE IF NOT EXISTS obrtniki (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ime TEXT NOT NULL,
  lokacija TEXT NOT NULL,
  storitev TEXT NOT NULL,
  ocena FLOAT DEFAULT 4.5,
  cena_na_uro INTEGER DEFAULT 25,
  razpoložljive_ure TEXT DEFAULT '08:00-18:00',
  verified BOOLEAN DEFAULT true,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create povprasevanja (inquiries) table
CREATE TABLE IF NOT EXISTS povprasevanja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storitev TEXT NOT NULL,
  lokacija TEXT NOT NULL,
  opis TEXT NOT NULL,
  obrtnik_id UUID REFERENCES obrtniki(id) ON DELETE SET NULL,
  termin_datum DATE NOT NULL,
  termin_ura TIME NOT NULL,
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'sprejeto', 'zavrnjeno', 'zakljuceno')),
  email TEXT,
  telefon TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create rezervacije (bookings) table
CREATE TABLE IF NOT EXISTS rezervacije (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  povprasevanje_id UUID REFERENCES povprasevanja(id) ON DELETE CASCADE,
  obrtnik_id UUID REFERENCES obrtniki(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'potrjena' CHECK (status IN ('potrjena', 'preklicana')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample contractors
INSERT INTO obrtniki (ime, lokacija, storitev, ocena, cena_na_uro, email) VALUES
('Marko Novak', 'Ljubljana', 'Vodovod', 4.8, 30, 'marko@example.com'),
('Ana Zajc', 'Ljubljana', 'Elektrika', 4.9, 35, 'ana@example.com'),
('Peter Gorenc', 'Maribor', 'Mizarstvo', 4.7, 25, 'peter@example.com'),
('Vesna Horvat', 'Ljubljana', 'Gradnje', 4.6, 40, 'vesna@example.com'),
('Jure Konjović', 'Celje', 'Ogrevanje', 4.5, 28, 'jure@example.com')
ON CONFLICT DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_povprasevanja_obrtnik_id ON povprasevanja(obrtnik_id);
CREATE INDEX IF NOT EXISTS idx_povprasevanja_status ON povprasevanja(status);
CREATE INDEX IF NOT EXISTS idx_obrtniki_storitev ON obrtniki(storitev);
CREATE INDEX IF NOT EXISTS idx_obrtniki_lokacija ON obrtniki(lokacija);
