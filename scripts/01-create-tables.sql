-- Create obrtniki table
CREATE TABLE IF NOT EXISTS obrtniki (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ime TEXT NOT NULL,
  priimek TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefon TEXT NOT NULL,
  storitev TEXT NOT NULL,
  lokacija TEXT NOT NULL,
  opis TEXT,
  ocena DECIMAL(3,2) DEFAULT 5.0,
  stevilo_ocen INTEGER DEFAULT 0,
  razdalja_km DECIMAL(5,2) DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create povprasevanja table (inquiries)
CREATE TABLE IF NOT EXISTS povprasevanja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storitev TEXT NOT NULL,
  lokacija TEXT NOT NULL,
  opis TEXT NOT NULL,
  obrtnik_id UUID REFERENCES obrtniki(id),
  termin_datum DATE,
  termin_ura TIME,
  status TEXT DEFAULT 'novo', -- novo, sprejeto, zavrnjeno, zakljuceno
  customer_ime TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_telefon TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create rezervacije table (bookings)
CREATE TABLE IF NOT EXISTS rezervacije (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  povprasevanje_id UUID REFERENCES povprasevanja(id),
  obrtnik_id UUID REFERENCES obrtniki(id),
  datum DATE NOT NULL,
  ura TIME NOT NULL,
  status TEXT DEFAULT 'potrjena', -- potrjena, preklicana, zakljucena
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_obrtniki_storitev ON obrtniki(storitev);
CREATE INDEX idx_obrtniki_lokacija ON obrtniki(lokacija);
CREATE INDEX idx_povprasevanja_status ON povprasevanja(status);
CREATE INDEX idx_povprasevanja_obrtnik_id ON povprasevanja(obrtnik_id);
CREATE INDEX idx_rezervacije_datum ON rezervacije(datum);
CREATE INDEX idx_rezervacije_ura ON rezervacije(ura);

-- Insert sample contractors for testing
INSERT INTO obrtniki (ime, priimek, email, telefon, storitev, lokacija, opis, ocena, stevilo_ocen, razdalja_km, verified, avatar_url) VALUES
('Marko', 'Novak', 'marko@example.com', '+386 1 234 5678', 'Vodovod', 'Ljubljana', 'Izkušen vodovodna inštalatér s 15 leti izkušenj', 4.9, 87, 2.5, true, 'https://api.dicebear.com/7.x/avataaars/svg?seed=marko'),
('Janez', 'Horvat', 'janez@example.com', '+386 41 234 567', 'Električne inštalacije', 'Ljubljana', 'Certificirani elektrikar z minimalnimi čekacami', 4.8, 56, 3.2, true, 'https://api.dicebear.com/7.x/avataaars/svg?seed=janez'),
('Ana', 'Svetelšek', 'ana@example.com', '+386 51 234 567', 'Ogrevanje', 'Ljubljana', 'Specialistka za toplotne črpalke in ogrevanje', 5.0, 43, 1.8, true, 'https://api.dicebear.com/7.x/avataaars/svg?seed=ana'),
('Peter', 'Zupan', 'peter@example.com', '+386 31 234 567', 'Mizarstvo', 'Ljubljana', 'Mizar z lastno delavnico in hitrim rokom', 4.7, 72, 4.5, true, 'https://api.dicebear.com/7.x/avataaars/svg?seed=peter'),
('Maja', 'Kos', 'maja@example.com', '+386 41 567 890', 'Slikopleskarstvo', 'Ljubljana', 'Profesionalna sleparka z bogatimi referencami', 4.9, 95, 2.1, true, 'https://api.dicebear.com/7.x/avataaars/svg?seed=maja');
