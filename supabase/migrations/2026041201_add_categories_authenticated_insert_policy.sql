-- Explicit policy for user-submitted category creation path.
-- Keeps category inserts constrained to auto-created active entries.

DROP POLICY IF EXISTS "categories_insert_authenticated_autocreate" ON public.categories;

CREATE POLICY "categories_insert_authenticated_autocreate"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_auto_created = true
    AND is_active = true
    AND char_length(btrim(name)) BETWEEN 2 AND 100
    AND sort_order >= 999
  );
