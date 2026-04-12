-- Restrict category insert path to trusted server-side flow only.
-- Prevents authenticated clients from bypassing getOrCreateCategory safeguards.

DROP POLICY IF EXISTS "categories_insert_authenticated_autocreate" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_service_autocreate" ON public.categories;

CREATE POLICY "categories_insert_service_autocreate"
  ON public.categories
  FOR INSERT
  TO service_role
  WITH CHECK (
    auth.role() = 'service_role'
    AND is_auto_created = true
    AND is_active = true
    AND char_length(btrim(name)) BETWEEN 2 AND 100
    AND sort_order >= 999
  );
