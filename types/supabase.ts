/**
 * Supabase Database Types
 * 
 * Generated from Prisma schema for type-safe database queries.
 * Matches the tables and columns in your Supabase database.
 * 
 * Note: In production, generate these types with:
 * npx supabase gen types typescript --project-id [project-ref] > types/supabase.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user: {
        Row: {
          id: string
          email: string
          phone: string | null
          name: string
          role: 'CUSTOMER' | 'CRAFTWORKER' | 'ADMIN'
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user']['Insert']>
      }
      craftworker_profile: {
        Row: {
          id: string
          user_id: string
          package_type: 'START' | 'PRO'
          commission_rate: number
          commission_override: number | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
          total_jobs_completed: number
          avg_rating: number
          is_verified: boolean
          verified_at: string | null
          loyalty_points: number
          bypass_warnings: number
          is_suspended: boolean
          suspended_at: string | null
          suspended_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['craftworker_profile']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['craftworker_profile']['Insert']>
      }
      job: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          city: string
          estimated_value: number | null
          status: 'PENDING' | 'MATCHED' | 'IN_PROGRESS' | 'AWAITING_CONFIRMATION' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED'
          customer_id: string
          craftworker_id: string | null
          payment_id: string | null
          conversation_id: string | null
          twilio_conversation_sid: string | null
          risk_score: number
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['job']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['job']['Insert']>
      }
      payment: {
        Row: {
          id: string
          amount: number
          platform_fee: number
          craftworker_payout: number
          status: 'UNPAID' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTED'
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          held_at: string | null
          released_at: string | null
          refunded_at: string | null
          dispute_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payment']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payment']['Insert']>
      }
      conversation: {
        Row: {
          id: string
          twilio_conversation_sid: string
          status: 'ACTIVE' | 'CLOSED' | 'SUSPENDED'
          participant_customer_sid: string | null
          participant_craftworker_sid: string | null
          contact_revealed_at: string | null
          last_message_at: string | null
          created_at: string
          closed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['conversation']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['conversation']['Insert']>
      }
      message: {
        Row: {
          id: string
          conversation_id: string
          sender_user_id: string
          body: string
          is_blocked: boolean
          blocked_reason: string | null
          twilio_message_sid: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['message']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['message']['Insert']>
      }
      violation: {
        Row: {
          id: string
          job_id: string | null
          user_id: string
          type: 'PHONE_DETECTED' | 'EMAIL_DETECTED' | 'BYPASS_ATTEMPT' | 'SUSPICIOUS_PATTERN'
          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          detected_content: string
          message_id: string | null
          is_reviewed: boolean
          reviewed_by: string | null
          reviewed_at: string | null
          action_taken: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['violation']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['violation']['Insert']>
      }
      portfolio_items: {
        Row: {
          id: string
          obrtnik_id: string
          title: string
          description: string | null
          category: string | null
          completed_at: string | null
          duration_days: number | null
          price_approx: number | null
          location_city: string | null
          image_urls: string[]
          is_featured: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['portfolio_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          image_urls?: string[]
          is_featured?: boolean
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['portfolio_items']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          phone: string | null
          role: 'narocnik' | 'obrtnik' | null
          location_city: string | null
          location_region: string | null
          subscription_tier: 'start' | 'pro' | 'elite' | 'enterprise' | null
          ai_messages_used_today: number
          ai_messages_reset_at: string
          ai_total_tokens_used: number
          ai_total_cost_usd: number
          referral_code: string | null
          credit_balance: number
          pro_days_earned: number
          notification_preferences: Record<string, unknown> | null
          created_at: string
          updated_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      sporocila: {
        Row: {
          id: string
          povprasevanje_id: string
          sender_id: string
          receiver_id: string
          message: string
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sporocila']['Row'], 'id' | 'created_at'> & {
          is_read?: boolean
          read_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['sporocila']['Insert']>
      }
    }
    Views: {}
    Functions: {
      user_role: {
        Args: Record<string, never>
        Returns: string
      }
      user_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {}
  }
}
