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
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sporocila']['Row'], 'id' | 'created_at'> & {
          is_read?: boolean
          read_at?: string | null
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
          subscription_tier: 'start' | 'pro' | null
          stripe_customer_id: string | null
          stripe_account_id: string | null
          tagline: string | null
          hourly_rate: number | null
          years_experience: number | null
          working_since: string | null
          website_url: string | null
          facebook_url: string | null
          instagram_url: string | null
          certificate_urls: string[] | null
          service_radius_km: number | null
          enable_instant_offers: boolean | null
          instant_offer_templates: Json | null
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
          subscription_tier?: 'start' | 'pro' | null
          stripe_customer_id?: string | null
          stripe_account_id?: string | null
          tagline?: string | null
          hourly_rate?: number | null
          years_experience?: number | null
          working_since?: string | null
          website_url?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          certificate_urls?: string[] | null
          service_radius_km?: number | null
          enable_instant_offers?: boolean | null
          instant_offer_templates?: Json | null
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
          notified_at: string | null
          created_at: string
          updated_at: string
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
          notified_at?: string | null
          created_at?: string
          updated_at?: string
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
          status: 'draft' | 'poslana' | 'sprejeta' | 'zavrnjena' | 'preklicana'
          created_at: string
          validity_days: number | null
          attachments: Json | null
          accepted_at: string | null
          title: string | null
          description: string | null
          estimated_duration: number | null
          notes: string | null
          auto_generated: boolean
          template_id: string | null
        }
        Insert: {
          id?: string
          povprasevanje_id: string
          obrtnik_id: string
          message: string
          price_estimate?: number | null
          price_type?: 'fiksna' | 'ocena' | 'po_ogledu'
          available_date?: string | null
          status?: 'draft' | 'poslana' | 'sprejeta' | 'zavrnjena' | 'preklicana'
          created_at?: string
          validity_days?: number | null
          attachments?: Json | null
          accepted_at?: string | null
          title?: string | null
          description?: string | null
          estimated_duration?: number | null
          notes?: string | null
          auto_generated?: boolean
          template_id?: string | null
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
          status: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          status?: string | null
          created_at?: string
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
          user_id: string
          old_value: Json
          new_value: Json
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          admin_id: string
          user_id: string
          old_value?: Json
          new_value?: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_audit_log']['Insert']>
        Relationships: []
      }
      event_log: {
        Row: {
          id: string
          event_name: string
          payload: Json
          emitted_at: string
        }
        Insert: {
          id?: string
          event_name: string
          payload: Json
          emitted_at?: string
        }
        Update: Partial<Database['public']['Tables']['event_log']['Insert']>
        Relationships: []
      }
      marketplace_events: {
        Row: {
          id: string
          event_type: 'request_created' | 'matched' | 'broadcast_sent_matched' | 'broadcast_sent_deadline_warning' | 'broadcast_sent_offer_accepted' | 'instant_offer' | 'offer_accepted' | 'expired' | 'guarantee_activated'
          request_id: string
          partner_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          event_type: 'request_created' | 'matched' | 'broadcast_sent_matched' | 'broadcast_sent_deadline_warning' | 'broadcast_sent_offer_accepted' | 'instant_offer' | 'offer_accepted' | 'expired' | 'guarantee_activated'
          request_id: string
          partner_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['marketplace_events']['Insert']>
        Relationships: [
          {
            foreignKeyName: "marketplace_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      analytics_events: {
        Row: {
          id: string
          event: string
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
          occurred_at: string
          created_at: string
        }
        Insert: {
          id?: string
          event: string
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
          occurred_at: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['analytics_events']['Insert']>
        Relationships: []
      }
      alert_log: {
        Row: {
          id: string
          alert_type: string
          severity: 'warn' | 'critical'
          message: string
          metadata: Json
          channels_notified: string[]
          resolved: boolean
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          alert_type: string
          severity: 'warn' | 'critical'
          message: string
          metadata?: Json
          channels_notified?: string[]
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['alert_log']['Insert']>
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
          failed_at: string
          resolved: boolean
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
          failed_at?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['event_dlq']['Insert']>
        Relationships: []
      }
      event_outbox: {
        Row: {
          id: string
          event_name: string
          payload: Json
          idempotency_key: string
          status: 'pending' | 'processing' | 'done' | 'failed'
          attempt_count: number
          next_attempt_at: string
          last_error: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          event_name: string
          payload: Json
          idempotency_key: string
          status?: 'pending' | 'processing' | 'done' | 'failed'
          attempt_count?: number
          next_attempt_at?: string
          last_error?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['event_outbox']['Insert']>
        Relationships: []
      }
      saga_instances: {
        Row: {
          id: string
          saga_type: string
          task_id: string
          current_step: number
          status: 'running' | 'completed' | 'compensating' | 'failed'
          completed_steps: Json
          compensation_log: Json
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          saga_type: string
          task_id: string
          current_step?: number
          status?: 'running' | 'completed' | 'compensating' | 'failed'
          completed_steps?: Json
          compensation_log?: Json
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['saga_instances']['Insert']>
        Relationships: []
      }
      escrow_holds: {
        Row: {
          id: string
          task_id: string | null
          amount: number
          status: 'held' | 'released' | 'refunded'
          payment_intent_id: string | null
          held_at: string | null
          released_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id?: string | null
          amount: number
          status?: 'held' | 'released' | 'refunded'
          payment_intent_id?: string | null
          held_at?: string | null
          released_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['escrow_holds']['Insert']>
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
