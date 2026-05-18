-- Migration: atomic accept_ponudba RPC
-- Accepts a ponudba and atomically:
--   1. Sets ponudba.status = 'sprejeta'
--   2. Rejects all other pending ponudbe for the same povprasevanje
--   3. Updates povprasevanje.status = 'v_teku' and obrtnik_id
-- Returns the obrtnik_id of the accepted ponudba.

CREATE OR REPLACE FUNCTION accept_ponudba(
  p_ponudba_id UUID,
  p_povprasevanje_id UUID,
  p_narocnik_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_obrtnik_id UUID;
  v_pov_narocnik_id UUID;
  v_pov_status TEXT;
  v_ponudba_status TEXT;
BEGIN
  -- Verify povprasevanje ownership
  SELECT narocnik_id, status
  INTO v_pov_narocnik_id, v_pov_status
  FROM povprasevanja
  WHERE id = p_povprasevanje_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Povpraševanje ni najdeno';
  END IF;

  IF v_pov_narocnik_id <> p_narocnik_id THEN
    RAISE EXCEPTION 'Nimate dostopa do tega povpraševanja';
  END IF;

  IF v_pov_status IN ('zakljuceno', 'preklicano', 'v_teku') THEN
    RAISE EXCEPTION 'Povpraševanje ne dovoljuje sprejema ponudbe';
  END IF;

  -- Fetch the ponudba
  SELECT obrtnik_id, status
  INTO v_obrtnik_id, v_ponudba_status
  FROM ponudbe
  WHERE id = p_ponudba_id AND povprasevanje_id = p_povprasevanje_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ponudba ni najdena ali ne pripada temu povpraševanju';
  END IF;

  IF v_ponudba_status = 'sprejeta' THEN
    RAISE EXCEPTION 'Ponudba je že sprejeta';
  END IF;

  -- Step 1: Accept the ponudba
  UPDATE ponudbe
  SET status = 'sprejeta', accepted_at = NOW()
  WHERE id = p_ponudba_id;

  -- Step 2: Reject all other pending ponudbe
  UPDATE ponudbe
  SET status = 'zavrnjena'
  WHERE povprasevanje_id = p_povprasevanje_id
    AND id <> p_ponudba_id
    AND status = 'poslana';

  -- Step 3: Update the povprasevanje
  UPDATE povprasevanja
  SET status = 'v_teku', obrtnik_id = v_obrtnik_id
  WHERE id = p_povprasevanje_id;

  RETURN v_obrtnik_id;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_ponudba(UUID, UUID, UUID) TO authenticated;
