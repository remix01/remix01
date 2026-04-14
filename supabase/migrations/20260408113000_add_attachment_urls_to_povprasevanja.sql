-- Ensure production schema contains attachment_urls used by /api/povprasevanje
ALTER TABLE public.povprasevanja
ADD COLUMN IF NOT EXISTS attachment_urls text[] NULL;

COMMENT ON COLUMN public.povprasevanja.attachment_urls IS
'Optional list of uploaded attachment URLs provided by narocnik when creating povprasevanje.';
