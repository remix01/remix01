export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// NOTE:
// The generated Supabase Database type was accidentally overwritten in this repository.
// Keep Database as `any` so existing typed clients compile until regenerated.
// Regenerate with:
//   supabase gen types typescript --project-id <id> --schema public > types/supabase.ts
export type Database = any
