-- Create admin_users table in auth schema for role-based access control
CREATE TYPE public.admin_role AS ENUM ('SUPER_ADMIN', 'MODERATOR', 'OPERATER');

CREATE TABLE auth.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  ime TEXT NOT NULL,
  priimek TEXT NOT NULL,
  vloga public.admin_role NOT NULL DEFAULT 'OPERATER',
  aktiven BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.admin_users(id)
);

-- Add indexes for performance
CREATE INDEX idx_admin_users_email ON auth.admin_users(email);
CREATE INDEX idx_admin_users_auth_user_id ON auth.admin_users(auth_user_id);
CREATE INDEX idx_admin_users_vloga ON auth.admin_users(vloga);
CREATE INDEX idx_admin_users_aktiven ON auth.admin_users(aktiven);
CREATE INDEX idx_admin_users_created_at ON auth.admin_users(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE auth.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all admin users
CREATE POLICY "Super admins can view all admin users"
  ON auth.admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.admin_users
      WHERE auth_user_id = auth.uid()
      AND vloga = 'SUPER_ADMIN'
      AND aktiven = true
    )
  );

-- Policy: Super admins can insert admin users
CREATE POLICY "Super admins can insert admin users"
  ON auth.admin_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.admin_users
      WHERE auth_user_id = auth.uid()
      AND vloga = 'SUPER_ADMIN'
      AND aktiven = true
    )
  );

-- Policy: Super admins can update admin users
CREATE POLICY "Super admins can update admin users"
  ON auth.admin_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.admin_users
      WHERE auth_user_id = auth.uid()
      AND vloga = 'SUPER_ADMIN'
      AND aktiven = true
    )
  );

-- Policy: Super admins can delete admin users (soft delete by setting aktiven=false)
CREATE POLICY "Super admins can delete admin users"
  ON auth.admin_users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.admin_users
      WHERE auth_user_id = auth.uid()
      AND vloga = 'SUPER_ADMIN'
      AND aktiven = true
    )
  );

-- Policy: Admins can view their own record
CREATE POLICY "Admins can view own record"
  ON auth.admin_users
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION auth.update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before UPDATE
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON auth.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION auth.update_admin_users_updated_at();

-- Grant necessary permissions for authenticated users to read their admin record
GRANT SELECT ON auth.admin_users TO authenticated;

-- Comment on table for documentation
COMMENT ON TABLE auth.admin_users IS 'Admin/employee accounts with role-based access control';
COMMENT ON COLUMN auth.admin_users.vloga IS 'Admin role: SUPER_ADMIN (full access), MODERATOR (read/write, no delete), OPERATER (read only + basic status changes)';
