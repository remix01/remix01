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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "portfolio_items_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          ime: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          avatar_url: string | null
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
          notification_preferences: Json | null
          is_suspended: boolean | null
          flagged: boolean | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          ime?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'narocnik' | 'obrtnik' | null
          location_city?: string | null
          location_region?: string | null
          subscription_tier?: 'start' | 'pro' | 'elite' | 'enterprise' | null
          ai_messages_used_today?: number
          ai_messages_reset_at?: string
          ai_total_tokens_used?: number
          ai_total_cost_usd?: number
          referral_code?: string | null
          credit_balance?: number
          pro_days_earned?: number
          notification_preferences?: Json | null
          is_suspended?: boolean | null
          flagged?: boolean | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          ime?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'narocnik' | 'obrtnik' | null
          location_city?: string | null
          location_region?: string | null
          subscription_tier?: 'start' | 'pro' | 'elite' | 'enterprise' | null
          ai_messages_used_today?: number
          ai_messages_reset_at?: string
          ai_total_tokens_used?: number
          ai_total_cost_usd?: number
          referral_code?: string | null
          credit_balance?: number
          pro_days_earned?: number
          notification_preferences?: Json | null
          is_suspended?: boolean | null
          flagged?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
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
          attachments: string[] | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sporocila']['Row'], 'id' | 'created_at'> & {
          is_read?: boolean
          read_at?: string | null
          attachments?: string[] | null
        }
        Update: Partial<Database['public']['Tables']['sporocila']['Insert']>
        Relationships: []
      }
      calendar_connections: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string | null
          expiry_date: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token?: string | null
          expiry_date?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['calendar_connections']['Insert']>
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          ponudba_id: string
          narocnik_id: string | null
          obrtnik_id: string | null
          scheduled_start: string
          scheduled_end: string
          narocnik_calendar_event_id: string | null
          obrtnik_calendar_event_id: string | null
          status: 'scheduled' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          ponudba_id: string
          narocnik_id?: string | null
          obrtnik_id?: string | null
          scheduled_start: string
          scheduled_end: string
          narocnik_calendar_event_id?: string | null
          obrtnik_calendar_event_id?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon_name: string | null
          description: string | null
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon_name?: string | null
          description?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
        Relationships: []
      }
      obrtnik_profiles: {
        Row: {
          id: string
          business_name: string
          description: string | null
          ajpes_id: string | null
          is_verified: boolean
          verification_status: 'pending' | 'verified' | 'rejected'
          avg_rating: number
          total_reviews: number
          response_time_hours: number | null
          is_available: boolean
          created_at: string
          enable_instant_offers: boolean | null
          instant_offer_templates: Json | null
          subscription_tier: 'start' | 'pro' | null
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          stripe_account_id: string | null
          portfolio_cover_url: string | null
          tagline: string | null
          hourly_rate: number | null
          years_experience: number | null
          working_since: string | null
          website_url: string | null
          facebook_url: string | null
          instagram_url: string | null
          certificate_urls: string[] | null
          service_radius_km: number | null
          number_of_ratings: number | null
          phone: string | null
        }
        Insert: {
          id: string
          business_name: string
          description?: string | null
          ajpes_id?: string | null
          is_verified?: boolean
          verification_status?: 'pending' | 'verified' | 'rejected'
          avg_rating?: number
          total_reviews?: number
          response_time_hours?: number | null
          is_available?: boolean
          created_at?: string
          enable_instant_offers?: boolean | null
          instant_offer_templates?: Json | null
          subscription_tier?: 'start' | 'pro' | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_account_id?: string | null
          portfolio_cover_url?: string | null
          tagline?: string | null
          hourly_rate?: number | null
          years_experience?: number | null
          working_since?: string | null
          website_url?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          certificate_urls?: string[] | null
          service_radius_km?: number | null
          number_of_ratings?: number | null
          phone?: string | null
        }
        Update: Partial<Database['public']['Tables']['obrtnik_profiles']['Insert']>
        Relationships: [
          {
            foreignKeyName: "obrtnik_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      obrtnik_availability: {
        Row: {
          id: string
          obrtnik_id: string
          day_of_week: number
          time_from: string | null
          time_to: string | null
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          obrtnik_id: string
          day_of_week: number
          time_from?: string | null
          time_to?: string | null
          is_available?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['obrtnik_availability']['Insert']>
        Relationships: [
          {
            foreignKeyName: "obrtnik_availability_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      service_areas: {
        Row: {
          id: string
          obrtnik_id: string
          city: string
          region: string | null
          radius_km: number | null
          lat: number | null
          lng: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          obrtnik_id: string
          city: string
          region?: string | null
          radius_km?: number | null
          lat?: number | null
          lng?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['service_areas']['Insert']>
        Relationships: [
          {
            foreignKeyName: "service_areas_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      escrow_transactions: {
        Row: {
          id: string
          inquiry_id: string | null
          partner_id: string | null
          obrtnik_id: string | null
          customer_email: string
          amount_cents: number
          platform_fee_cents: number
          status: string
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inquiry_id?: string | null
          partner_id?: string | null
          obrtnik_id?: string | null
          customer_email: string
          amount_cents: number
          platform_fee_cents?: number
          status?: string
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['escrow_transactions']['Insert']>
        Relationships: []
      }
      obrtnik_categories: {
        Row: {
          obrtnik_id: string
          category_id: string
        }
        Insert: {
          obrtnik_id: string
          category_id: string
        }
        Update: Partial<Database['public']['Tables']['obrtnik_categories']['Insert']>
        Relationships: [
          {
            foreignKeyName: "obrtnik_categories_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      povprasevanja: {
        Row: {
          id: string
          narocnik_id: string
          category_id: string
          title: string
          description: string
          location_city: string
          location_region: string | null
          location_notes: string | null
          urgency: 'normalno' | 'kmalu' | 'nujno'
          preferred_date_from: string | null
          preferred_date_to: string | null
          budget_min: number | null
          budget_max: number | null
          status: 'odprto' | 'v_teku' | 'zakljuceno' | 'preklicano'
          created_at: string
          updated_at: string
          stranka_email: string | null
          stranka_telefon: string | null
          obrtnik_id: string | null
          notified_at: string | null
          attachments: string[] | null
          lat: number | null
          lng: number | null
        }
        Insert: {
          id?: string
          narocnik_id: string
          category_id: string
          title: string
          description: string
          location_city: string
          location_region?: string | null
          location_notes?: string | null
          urgency?: 'normalno' | 'kmalu' | 'nujno'
          preferred_date_from?: string | null
          preferred_date_to?: string | null
          budget_min?: number | null
          budget_max?: number | null
          status?: 'odprto' | 'v_teku' | 'zakljuceno' | 'preklicano'
          created_at?: string
          updated_at?: string
          stranka_email?: string | null
          stranka_telefon?: string | null
          obrtnik_id?: string | null
          notified_at?: string | null
          attachments?: string[] | null
          lat?: number | null
          lng?: number | null
        }
        Update: Partial<Database['public']['Tables']['povprasevanja']['Insert']>
        Relationships: [
          {
            foreignKeyName: "povprasevanja_narocnik_id_fkey"
            columns: ["narocnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "povprasevanja_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      ponudbe: {
        Row: {
          id: string
          povprasevanje_id: string
          obrtnik_id: string
          message: string
          price_estimate: number | null
          price_type: 'fiksna' | 'ocena' | 'po_ogledu'
          available_date: string | null
          status: 'poslana' | 'sprejeta' | 'zavrnjena' | 'accepted'
          created_at: string
          validity_days: number | null
          attachments: string[] | null
          estimated_duration: string | null
          accepted_at: string | null
        }
        Insert: {
          id?: string
          povprasevanje_id: string
          obrtnik_id: string
          message: string
          price_estimate?: number | null
          price_type?: 'fiksna' | 'ocena' | 'po_ogledu'
          available_date?: string | null
          status?: 'poslana' | 'sprejeta' | 'zavrnjena' | 'accepted'
          created_at?: string
          validity_days?: number | null
          attachments?: string[] | null
          estimated_duration?: string | null
          accepted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['ponudbe']['Insert']>
        Relationships: [
          {
            foreignKeyName: "ponudbe_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponudbe_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          message: string | null
          resource_id: string | null
          resource_type: string | null
          link: string | null
          metadata: Json
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body: string
          message?: string | null
          resource_id?: string | null
          resource_type?: string | null
          link?: string | null
          metadata?: Json
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string | null
          auth: string | null
          device_info: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh?: string | null
          auth?: string | null
          device_info?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          reward_granted: boolean
          reward_type: string | null
          reward_amount: number | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          reward_granted?: boolean
          reward_type?: string | null
          reward_amount?: number | null
          created_at?: string
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['referrals']['Insert']>
        Relationships: []
      }
      ocene: {
        Row: {
          id: string
          ponudba_id: string
          narocnik_id: string
          obrtnik_id: string
          rating: number
          quality_rating: number | null
          punctuality_rating: number | null
          price_rating: number | null
          comment: string | null
          photos: string[] | null
          obrtnik_reply: string | null
          replied_at: string | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          ponudba_id: string
          narocnik_id: string
          obrtnik_id: string
          rating: number
          quality_rating?: number | null
          punctuality_rating?: number | null
          price_rating?: number | null
          comment?: string | null
          photos?: string[] | null
          obrtnik_reply?: string | null
          replied_at?: string | null
          is_public?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['ocene']['Insert']>
        Relationships: [
          {
            foreignKeyName: "ocene_narocnik_id_fkey"
            columns: ["narocnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocene_ponudba_id_fkey"
            columns: ["ponudba_id"]
            isOneToOne: false
            referencedRelation: "ponudbe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocene_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      payouts: {
        Row: {
          id: string
          ponudba_id: string | null
          obrtnik_id: string | null
          amount_eur: number
          commission_eur: number
          stripe_transfer_id: string | null
          status: 'pending' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          ponudba_id?: string | null
          obrtnik_id?: string | null
          amount_eur: number
          commission_eur: number
          stripe_transfer_id?: string | null
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['payouts']['Insert']>
        Relationships: []
      }
      admin_users: {
        Row: {
          id: string
          auth_user_id: string | null
          email: string
          ime: string
          priimek: string
          vloga: string
          aktiven: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          email: string
          ime: string
          priimek: string
          vloga?: string
          aktiven?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
        Relationships: []
      }
      commission_logs: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          escrow_id: string | null
          partner_id: string | null
          inquiry_id: string | null
          gross_amount_cents: number
          platform_commission_cents: number
          commission_cents: number
          net_amount_cents: number
          commission_rate: number
          status: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          escrow_id?: string | null
          partner_id?: string | null
          inquiry_id?: string | null
          gross_amount_cents: number
          platform_commission_cents?: number
          commission_cents: number
          net_amount_cents: number
          commission_rate: number
          status?: string
        }
        Update: Partial<Database['public']['Tables']['commission_logs']['Insert']>
        Relationships: []
      }
      inquiries: {
        Row: {
          id: string
          service_type: string
          location: string
          email: string
          phone: string
          preferred_date: string | null
          description: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_type: string
          location: string
          email: string
          phone: string
          preferred_date?: string | null
          description: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['inquiries']['Insert']>
        Relationships: []
      }
      notification_logs: {
        Row: {
          id: string
          type: string
          recipient_id: string
          channel: string
          request_id: string | null
          sent_at: string
          status: string
          error_message: string | null
        }
        Insert: {
          id?: string
          type: string
          recipient_id: string
          channel: string
          request_id?: string | null
          sent_at?: string
          status?: string
          error_message?: string | null
        }
        Update: Partial<Database['public']['Tables']['notification_logs']['Insert']>
        Relationships: []
      }
      refund_triggers: {
        Row: {
          id: string
          request_id: string
          triggered_at: string
          reason: string
          status: string
        }
        Insert: {
          id?: string
          request_id: string
          triggered_at?: string
          reason: string
          status?: string
        }
        Update: Partial<Database['public']['Tables']['refund_triggers']['Insert']>
        Relationships: []
      }
      obrtniki: {
        Row: {
          id: string
          ime: string | null
          priimek: string | null
          podjetje: string | null
          specialnosti: string[] | null
          lokacije: string[] | null
          cena_min: number | null
          cena_max: number | null
          ocena: number | null
          stevilo_ocen: number | null
          leta_izkusenj: number | null
          profilna_slika_url: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ime?: string | null
          priimek?: string | null
          podjetje?: string | null
          specialnosti?: string[] | null
          lokacije?: string[] | null
          cena_min?: number | null
          cena_max?: number | null
          ocena?: number | null
          stevilo_ocen?: number | null
          leta_izkusenj?: number | null
          profilna_slika_url?: string | null
          status?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['obrtniki']['Insert']>
        Relationships: []
      }
      service_requests: {
        Row: {
          id: string
          povprasevanje_id: string | null
          request_id: string | null
          status: string
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          povprasevanje_id?: string | null
          request_id?: string | null
          status?: string
          updated_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['service_requests']['Insert']>
        Relationships: []
      }
      offers: {
        Row: {
          id: string
          partner_id: string | null
          status: string | null
          price: number | null
          customer_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          partner_id?: string | null
          status?: string | null
          price?: number | null
          customer_name?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['offers']['Insert']>
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          title: string | null
          description: string | null
          status: string | null
          created_by: string | null
          assigned_to: string | null
          created_at: string
          published_at: string | null
          accepted_at: string | null
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          expires_at: string | null
          expired_at: string | null
          sla_expires_at: string | null
          sla_deadline: string | null
          priority: string | null
          customer_id: string | null
          category_id: string | null
          worker_id: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title?: string | null
          description?: string | null
          status?: string | null
          created_by?: string | null
          assigned_to?: string | null
          created_at?: string
          published_at?: string | null
          accepted_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          expires_at?: string | null
          expired_at?: string | null
          sla_expires_at?: string | null
          sla_deadline?: string | null
          priority?: string | null
          customer_id?: string | null
          category_id?: string | null
          worker_id?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
        Relationships: []
      }
      worker_stats: {
        Row: {
          id: string
          worker_id: string | null
          tasks_completed: number | null
          created_at: string
        }
        Insert: {
          id?: string
          worker_id?: string | null
          tasks_completed?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['worker_stats']['Insert']>
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          id: string
          action: string
          admin_id: string
          target_id: string | null
          target_type: string | null
          details: Json | null
          user_id: string | null
          old_value: Json | null
          new_value: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          admin_id: string
          target_id?: string | null
          target_type?: string | null
          details?: Json | null
          user_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_audit_log']['Insert']>
        Relationships: []
      }
      agent_conversations: {
        Row: {
          id: string
          user_id: string
          messages: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          messages: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['agent_conversations']['Insert']>
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          id: string
          user_id: string
          message_hash: string | null
          user_message: string | null
          model_used: string
          response_time_ms: number | null
          tokens_input: number
          tokens_output: number
          tokens_cached: number | null
          cost_usd: number
          response_cached: boolean | null
          led_to_inquiry: boolean | null
          inquiry_id: string | null
          created_at: string | null
          agent_type: string | null
        }
        Insert: {
          id?: string
          user_id: string
          message_hash?: string | null
          user_message?: string | null
          model_used: string
          response_time_ms?: number | null
          tokens_input: number
          tokens_output: number
          tokens_cached?: number | null
          cost_usd: number
          response_cached?: boolean | null
          led_to_inquiry?: boolean | null
          inquiry_id?: string | null
          created_at?: string | null
          agent_type?: string | null
        }
        Update: Partial<Database['public']['Tables']['ai_usage_logs']['Insert']>
        Relationships: []
      }
      agent_definitions: {
        Row: {
          id: string
          agent_type: string
          display_name: string
          description: string | null
          system_prompt: string
          model_preference: string | null
          required_tier: string[] | null
          enabled: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agent_type: string
          display_name: string
          description?: string | null
          system_prompt: string
          model_preference?: string | null
          required_tier?: string[] | null
          enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['agent_definitions']['Insert']>
        Relationships: []
      }
      ai_agent_conversations: {
        Row: {
          id: string
          user_id: string
          agent_type: string
          context: Json | null
          messages: Json
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          agent_type: string
          context?: Json | null
          messages: Json
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['ai_agent_conversations']['Insert']>
        Relationships: []
      }
      agent_matches: {
        Row: {
          id: string
          povprasevanje_id: string
          matches: Json
          reasoning: string | null
          created_at: string
        }
        Insert: {
          id?: string
          povprasevanje_id: string
          matches: Json
          reasoning?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['agent_matches']['Insert']>
        Relationships: []
      }
      agent_jobs: {
        Row: {
          id: string
          user_id: string
          agent_type: string
          job_type: string
          status: string
          input_payload: Json
          result_payload: Json | null
          error_message: string | null
          tokens_input: number
          tokens_output: number
          cost_usd: number
          model_used: string | null
          queued_at: string
          started_at: string | null
          completed_at: string | null
          callback_url: string | null
          qstash_msg_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          agent_type: string
          job_type: string
          status: string
          input_payload: Json
          result_payload?: Json | null
          error_message?: string | null
          tokens_input: number
          tokens_output: number
          cost_usd: number
          model_used?: string | null
          queued_at?: string
          started_at?: string | null
          completed_at?: string | null
          callback_url?: string | null
          qstash_msg_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['agent_jobs']['Insert']>
        Relationships: []
      }
      agent_cost_summary: {
        Row: {
          id: string
          user_id: string
          agent_type: string
          date: string
          messages: number
          tokens_in: number
          tokens_out: number
          cost_usd: number
        }
        Insert: {
          id?: string
          user_id: string
          agent_type: string
          date: string
          messages: number
          tokens_in: number
          tokens_out: number
          cost_usd: number
        }
        Update: Partial<Database['public']['Tables']['agent_cost_summary']['Insert']>
        Relationships: []
      }
      agent_logs: {
        Row: {
          id: string
          session_id: string
          user_id: string | null
          level: string
          event: string
          tool: string | null
          params: Json | null
          result: Json | null
          duration_ms: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          user_id?: string | null
          level: string
          event: string
          tool?: string | null
          params?: Json | null
          result?: Json | null
          duration_ms?: number | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['agent_logs']['Insert']>
        Relationships: []
      }
      agent_user_memory: {
        Row: {
          user_id: string
          preferences: Json
          recent_activity: Json
          summary: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          preferences: Json
          recent_activity: Json
          summary?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['agent_user_memory']['Insert']>
        Relationships: []
      }
      agent_quote_drafts: {
        Row: {
          id: string
          obrtnik_id: string
          povprasevanje_id: string | null
          draft_text: string
          price_min: number | null
          price_max: number | null
          duration_text: string | null
          cross_sell: string[] | null
          context_used: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          obrtnik_id: string
          povprasevanje_id?: string | null
          draft_text: string
          price_min?: number | null
          price_max?: number | null
          duration_text?: string | null
          cross_sell?: string[] | null
          context_used?: Json | null
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['agent_quote_drafts']['Insert']>
        Relationships: []
      }
      agent_job_reports: {
        Row: {
          id: string
          obrtnik_id: string
          povprasevanje_id: string | null
          ponudba_id: string | null
          report_text: string
          report_data: Json | null
          sent_to_customer: boolean
          customer_confirmed: boolean | null
          confirmed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          obrtnik_id: string
          povprasevanje_id?: string | null
          ponudba_id?: string | null
          report_text: string
          report_data?: Json | null
          sent_to_customer?: boolean
          customer_confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['agent_job_reports']['Insert']>
        Relationships: []
      }
      agent_material_lists: {
        Row: {
          id: string
          agent_job_id: string | null
          obrtnik_id: string
          povprasevanje_id: string | null
          material_list: Json
          total_min_eur: number | null
          total_max_eur: number | null
          suppliers: string[] | null
          predracun_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_job_id?: string | null
          obrtnik_id: string
          povprasevanje_id?: string | null
          material_list: Json
          total_min_eur?: number | null
          total_max_eur?: number | null
          suppliers?: string[] | null
          predracun_text?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['agent_material_lists']['Insert']>
        Relationships: []
      }
      alert_log: {
        Row: {
          id: string
          alert_type: string
          severity: string
          message: string
          metadata: Json | null
          channels_notified: string[] | null
          resolved: boolean | null
          resolved_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          alert_type: string
          severity: string
          message: string
          metadata?: Json | null
          channels_notified?: string[] | null
          resolved?: boolean | null
          resolved_at?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['alert_log']['Insert']>
        Relationships: []
      }
      analytics_events: {
        Row: {
          id: string
          event: string
          event_name: string | null
          user_id: string | null
          task_id: string | null
          partner_id: string | null
          category_id: string | null
          region_lat: number | null
          region_lng: number | null
          top_score: number | null
          price: number | null
          final_price: number | null
          gross: number | null
          commission: number | null
          net: number | null
          properties: Json | null
          occurred_at: string
          created_at: string | null
        }
        Insert: {
          id?: string
          event: string
          event_name?: string | null
          user_id?: string | null
          task_id?: string | null
          partner_id?: string | null
          category_id?: string | null
          region_lat?: number | null
          region_lng?: number | null
          top_score?: number | null
          price?: number | null
          final_price?: number | null
          gross?: number | null
          commission?: number | null
          net?: number | null
          properties?: Json | null
          occurred_at?: string
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['analytics_events']['Insert']>
        Relationships: []
      }
      assignments: {
        Row: {
          id: string
          task_id: string
          worker_id: string
          assigned_at: string | null
          assigned_by: string | null
          status: string | null
          completed_at: string | null
          expires_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          task_id: string
          worker_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          status?: string | null
          completed_at?: string | null
          expires_at?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['assignments']['Insert']>
        Relationships: []
      }
      data_records: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          status: string | null
          category: string | null
          value: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          status?: string | null
          category?: string | null
          value?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['data_records']['Insert']>
        Relationships: []
      }
      escrow_holds: {
        Row: {
          id: string
          task_id: string | null
          amount: number
          status: string
          payment_intent_id: string | null
          held_at: string | null
          released_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          task_id?: string | null
          amount: number
          status: string
          payment_intent_id?: string | null
          held_at?: string | null
          released_at?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['escrow_holds']['Insert']>
        Relationships: []
      }
      event_dlq: {
        Row: {
          id: string
          original_outbox_id: string | null
          event_name: string
          payload: Json
          failure_reason: string | null
          attempt_count: number | null
          failed_at: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          original_outbox_id?: string | null
          event_name: string
          payload: Json
          failure_reason?: string | null
          attempt_count?: number | null
          failed_at?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['event_dlq']['Insert']>
        Relationships: []
      }
      event_log: {
        Row: {
          id: string
          event_name: string
          payload: Json
          emitted_at: string | null
        }
        Insert: {
          id?: string
          event_name: string
          payload: Json
          emitted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['event_log']['Insert']>
        Relationships: []
      }
      event_outbox: {
        Row: {
          id: string
          event_name: string
          payload: Json
          idempotency_key: string
          status: string | null
          attempt_count: number | null
          next_attempt_at: string | null
          last_error: string | null
          created_at: string | null
          processed_at: string | null
        }
        Insert: {
          id?: string
          event_name: string
          payload: Json
          idempotency_key: string
          status?: string | null
          attempt_count?: number | null
          next_attempt_at?: string | null
          last_error?: string | null
          created_at?: string | null
          processed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['event_outbox']['Insert']>
        Relationships: []
      }
      event_processing_log: {
        Row: {
          id: string
          idempotency_key: string
          consumer: string
          event_name: string
          entity_id: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          idempotency_key: string
          consumer: string
          event_name: string
          entity_id: string
          processed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['event_processing_log']['Insert']>
        Relationships: []
      }
      job_queue: {
        Row: {
          id: string
          type: string
          payload: Json
          status: string
          attempts: number
          last_error: string | null
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          type: string
          payload: Json
          status: string
          attempts: number
          last_error?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['job_queue']['Insert']>
        Relationships: []
      }
      job_reports: {
        Row: {
          id: string
          obrtnik_id: string
          povprasevanje_id: string | null
          ponudba_id: string | null
          title: string
          work_performed: string | null
          materials_used: Json | null
          photos: string[] | null
          notes: string | null
          ai_summary: string | null
          ai_summary_sl: string | null
          status: string
          sent_to_customer: boolean | null
          customer_confirmed_at: string | null
          warranty_months: number | null
          warranty_expires_at: string | null
          total_cost: number | null
          duration_hours: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          obrtnik_id: string
          povprasevanje_id?: string | null
          ponudba_id?: string | null
          title: string
          work_performed?: string | null
          materials_used?: Json | null
          photos?: string[] | null
          notes?: string | null
          ai_summary?: string | null
          ai_summary_sl?: string | null
          status: string
          sent_to_customer?: boolean | null
          customer_confirmed_at?: string | null
          warranty_months?: number | null
          warranty_expires_at?: string | null
          total_cost?: number | null
          duration_hours?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['job_reports']['Insert']>
        Relationships: []
      }
      marketplace_events: {
        Row: {
          id: string
          event_type: string
          request_id: string
          partner_id: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_type: string
          request_id: string
          partner_id?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['marketplace_events']['Insert']>
        Relationships: []
      }
      materials_lists: {
        Row: {
          id: string
          obrtnik_id: string
          povprasevanje_id: string | null
          job_report_id: string | null
          title: string
          items: Json
          total_estimated: number | null
          currency: string | null
          status: string | null
          ai_generated: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          obrtnik_id: string
          povprasevanje_id?: string | null
          job_report_id?: string | null
          title: string
          items: Json
          total_estimated?: number | null
          currency?: string | null
          status?: string | null
          ai_generated?: boolean | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['materials_lists']['Insert']>
        Relationships: []
      }
      obrtnik_reviews: {
        Row: {
          id: string
          obrtnik_id: string
          reviewer_id: string
          rating: number | null
          comment: string | null
          created_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          obrtnik_id: string
          reviewer_id: string
          rating?: number | null
          comment?: string | null
          created_at?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['obrtnik_reviews']['Insert']>
        Relationships: []
      }
      partner_paketi: {
        Row: {
          id: string
          obrtnik_id: string
          paket: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: string
          current_period_start: string | null
          current_period_end: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          obrtnik_id: string
          paket: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status: string
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['partner_paketi']['Insert']>
        Relationships: []
      }
      partners: {
        Row: {
          id: string
          company_name: string
          description: string | null
          phone_number: string | null
          website: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          category: string | null
          rating: number | null
          verified: boolean | null
          created_at: string | null
          updated_at: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          subscription_plan: string | null
          new_profile_id: string | null
          migrated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          company_name: string
          description?: string | null
          phone_number?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          category?: string | null
          rating?: number | null
          verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          subscription_plan?: string | null
          new_profile_id?: string | null
          migrated_at?: string | null
          user_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['partners']['Insert']>
        Relationships: []
      }
      risk_scores: {
        Row: {
          id: string
          povprasevanje_id: string
          score: number
          flags: string[] | null
          triggered_alert: boolean | null
          alert_level: string | null
          checked_at: string | null
        }
        Insert: {
          id?: string
          povprasevanje_id: string
          score: number
          flags?: string[] | null
          triggered_alert?: boolean | null
          alert_level?: string | null
          checked_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['risk_scores']['Insert']>
        Relationships: []
      }
      saga_instances: {
        Row: {
          id: string
          saga_type: string
          task_id: string
          current_step: number | null
          status: string | null
          completed_steps: Json | null
          compensation_log: Json | null
          error_message: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          saga_type: string
          task_id: string
          current_step?: number | null
          status?: string | null
          completed_steps?: Json | null
          compensation_log?: Json | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['saga_instances']['Insert']>
        Relationships: []
      }
      task_events: {
        Row: {
          id: string
          task_id: string | null
          event_type: string
          actor_id: string | null
          payload: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          task_id?: string | null
          event_type: string
          actor_id?: string | null
          payload?: Json | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['task_events']['Insert']>
        Relationships: []
      }
      task_locks: {
        Row: {
          task_id: string
          worker_id: string
          locked_at: string | null
        }
        Insert: {
          task_id: string
          worker_id: string
          locked_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['task_locks']['Insert']>
        Relationships: []
      }
      task_queue_jobs: {
        Row: {
          id: string
          job_type: string
          payload: Json
          status: string | null
          attempt_count: number | null
          max_attempts: number | null
          next_attempt_at: string | null
          error_message: string | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          job_type: string
          payload: Json
          status?: string | null
          attempt_count?: number | null
          max_attempts?: number | null
          next_attempt_at?: string | null
          error_message?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['task_queue_jobs']['Insert']>
        Relationships: []
      }
      task_sla: {
        Row: {
          task_id: string
          published_at: string | null
          deadline_at: string | null
          escalated: boolean | null
        }
        Insert: {
          task_id: string
          published_at?: string | null
          deadline_at?: string | null
          escalated?: boolean | null
        }
        Update: Partial<Database['public']['Tables']['task_sla']['Insert']>
        Relationships: []
      }
      zaposleni: {
        Row: {
          id: string
          email: string
          ime: string
          priimek: string
          vloga: string
          aktiven: boolean
          createdAt: string
          updatedAt: string
          createdBy: string | null
          skills: string[] | null
          location: string | null
          max_distance: number | null
          availability: Json | null
        }
        Insert: {
          id?: string
          email: string
          ime: string
          priimek: string
          vloga: string
          aktiven?: boolean
          createdAt?: string
          updatedAt?: string
          createdBy?: string | null
          skills?: string[] | null
          location?: string | null
          max_distance?: number | null
          availability?: Json | null
        }
        Update: Partial<Database['public']['Tables']['zaposleni']['Insert']>
        Relationships: []
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
