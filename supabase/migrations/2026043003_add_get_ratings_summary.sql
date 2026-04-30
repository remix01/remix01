-- Returns a single row with total review count and average rating.
-- Called by the homepage instead of fetching all rows and averaging in JS.
-- SECURITY DEFINER + search_path lock prevents search_path hijacking.
-- Executable by anon (public homepage) and authenticated.
CREATE OR REPLACE FUNCTION public.get_ratings_summary()
RETURNS TABLE (total bigint, avg numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint          AS total,
    ROUND(AVG(rating)::numeric, 1) AS avg
  FROM public.ocene;
$$;

-- Revoke blanket public grant, then re-grant only to the roles that need it.
REVOKE EXECUTE ON FUNCTION public.get_ratings_summary() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ratings_summary() TO anon, authenticated;
