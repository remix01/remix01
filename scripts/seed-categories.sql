-- Seed categories table with initial data
INSERT INTO public.categories 
  (name, slug, icon_name, is_active) VALUES
  ('Vodovodna dela', 'vodovodna-dela', '🔧', true),
  ('Elektrika', 'elektrika', '⚡', true),
  ('Slikopleskarstvo', 'slikopleskarstvo', '🖌️', true),
  ('Tesarstvo', 'tesarstvo', '🪚', true),
  ('Keramika', 'keramika', '🏠', true),
  ('Kleparstvo', 'kleparstvo', '🔩', true),
  ('Ogrevanje', 'ogrevanje', '🌡️', true),
  ('Klimatizacija', 'klimatizacija', '❄️', true),
  ('Selitve', 'selitve', '📦', true),
  ('Čiščenje', 'ciscenje', '🧹', true),
  ('Vrtnarstvo', 'vrtnarstvo', '🌿', true),
  ('Varovanje', 'varovanje', '🔒', true),
  ('Pohištvo', 'pohistvo', '🪑', true),
  ('Streha', 'streha', '🏗️', true),
  ('Gradbena dela', 'gradbena-dela', '🧱', true)
ON CONFLICT (slug) DO NOTHING;
