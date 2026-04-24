export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Temporary permissive type until generated Supabase types are restored.
export type Database = any
