-- Fix admin_users RLS policy: user_id → auth_user_id
-- The previous migration referenced non-existent column "user_id";
-- the correct column name is "auth_user_id".

BEGIN;

DROP POLICY IF EXISTS "admin_users_select_combined" ON admin_users;
DROP POLICY IF EXISTS "Admins can view own record" ON admin_users;
DROP POLICY IF EXISTS "Super admins can view all admin users" ON admin_users;

CREATE POLICY "admin_users_select_combined" ON admin_users
FOR SELECT USING (
  -- Super admin vidi vse
  EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.auth_user_id = (SELECT auth.uid())
      AND a.vloga = 'SUPER_ADMIN'
      AND a.aktiven = true
  )
  OR
  -- Admin vidi svoj zapis
  (SELECT auth.uid()) = auth_user_id
);

COMMIT;
