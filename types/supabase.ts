export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          aktiven: boolean
          auth_user_id: string | null
          created_at: string
          created_by: string | null
          email: string
          id: string
          ime: string
          priimek: string
          updated_at: string
          vloga: Database["public"]["Enums"]["admin_role"]
        }
        Insert: {
          aktiven?: boolean
          auth_user_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          ime: string
          priimek: string
          updated_at?: string
          vloga?: Database["public"]["Enums"]["admin_role"]
        }
        Update: {
          aktiven?: boolean
          auth_user_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          ime?: string
          priimek?: string
          updated_at?: string
          vloga?: Database["public"]["Enums"]["admin_role"]
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          created_at: string | null
          id: string
          messages: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_cost_summary: {
        Row: {
          agent_type: string
          cost_usd: number
          date: string
          id: string
          messages: number
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          agent_type: string
          cost_usd?: number
          date?: string
          id?: string
          messages?: number
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          agent_type?: string
          cost_usd?: number
          date?: string
          id?: string
          messages?: number
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_cost_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_definitions: {
        Row: {
          agent_type: string
          created_at: string | null
          description: string | null
          display_name: string
          enabled: boolean | null
          id: string
          model_preference: string | null
          required_tier: string[] | null
          system_prompt: string
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          description?: string | null
          display_name: string
          enabled?: boolean | null
          id?: string
          model_preference?: string | null
          required_tier?: string[] | null
          system_prompt: string
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          enabled?: boolean | null
          id?: string
          model_preference?: string | null
          required_tier?: string[] | null
          system_prompt?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_job_reports: {
        Row: {
          confirmed_at: string | null
          created_at: string
          customer_confirmed: boolean | null
          id: string
          obrtnik_id: string
          ponudba_id: string | null
          povprasevanje_id: string | null
          report_data: Json | null
          report_text: string
          sent_to_customer: boolean
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          customer_confirmed?: boolean | null
          id?: string
          obrtnik_id: string
          ponudba_id?: string | null
          povprasevanje_id?: string | null
          report_data?: Json | null
          report_text: string
          sent_to_customer?: boolean
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          customer_confirmed?: boolean | null
          id?: string
          obrtnik_id?: string
          ponudba_id?: string | null
          povprasevanje_id?: string | null
          report_data?: Json | null
          report_text?: string
          sent_to_customer?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agent_job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "agent_job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "agent_job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_job_reports_ponudba_id_fkey"
            columns: ["ponudba_id"]
            isOneToOne: false
            referencedRelation: "ponudbe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_job_reports_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_job_reports_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_jobs: {
        Row: {
          agent_type: string
          callback_url: string | null
          completed_at: string | null
          cost_usd: number
          error_message: string | null
          id: string
          input_payload: Json
          job_type: string
          model_used: string | null
          qstash_msg_id: string | null
          queued_at: string
          result_payload: Json | null
          started_at: string | null
          status: string
          tokens_input: number
          tokens_output: number
          user_id: string
        }
        Insert: {
          agent_type: string
          callback_url?: string | null
          completed_at?: string | null
          cost_usd?: number
          error_message?: string | null
          id?: string
          input_payload?: Json
          job_type: string
          model_used?: string | null
          qstash_msg_id?: string | null
          queued_at?: string
          result_payload?: Json | null
          started_at?: string | null
          status?: string
          tokens_input?: number
          tokens_output?: number
          user_id: string
        }
        Update: {
          agent_type?: string
          callback_url?: string | null
          completed_at?: string | null
          cost_usd?: number
          error_message?: string | null
          id?: string
          input_payload?: Json
          job_type?: string
          model_used?: string | null
          qstash_msg_id?: string | null
          queued_at?: string
          result_payload?: Json | null
          started_at?: string | null
          status?: string
          tokens_input?: number
          tokens_output?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          event: string
          id: string
          level: string
          params: Json | null
          result: Json | null
          session_id: string
          tool: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          event: string
          id?: string
          level: string
          params?: Json | null
          result?: Json | null
          session_id: string
          tool?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          event?: string
          id?: string
          level?: string
          params?: Json | null
          result?: Json | null
          session_id?: string
          tool?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      agent_matches: {
        Row: {
          created_at: string
          id: string
          matches: Json
          povprasevanje_id: string
          reasoning: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          matches?: Json
          povprasevanje_id: string
          reasoning?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          matches?: Json
          povprasevanje_id?: string
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_matches_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_matches_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_material_lists: {
        Row: {
          agent_job_id: string | null
          created_at: string
          id: string
          material_list: Json
          obrtnik_id: string
          povprasevanje_id: string | null
          predracun_text: string | null
          suppliers: string[] | null
          total_max_eur: number | null
          total_min_eur: number | null
        }
        Insert: {
          agent_job_id?: string | null
          created_at?: string
          id?: string
          material_list?: Json
          obrtnik_id: string
          povprasevanje_id?: string | null
          predracun_text?: string | null
          suppliers?: string[] | null
          total_max_eur?: number | null
          total_min_eur?: number | null
        }
        Update: {
          agent_job_id?: string | null
          created_at?: string
          id?: string
          material_list?: Json
          obrtnik_id?: string
          povprasevanje_id?: string | null
          predracun_text?: string | null
          suppliers?: string[] | null
          total_max_eur?: number | null
          total_min_eur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_material_lists_agent_job_id_fkey"
            columns: ["agent_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_material_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_material_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_material_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "agent_material_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_material_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_material_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "agent_material_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_material_lists_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_material_lists_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_quote_drafts: {
        Row: {
          context_used: Json | null
          created_at: string
          cross_sell: string[] | null
          draft_text: string
          duration_text: string | null
          id: string
          obrtnik_id: string
          povprasevanje_id: string | null
          price_max: number | null
          price_min: number | null
          status: string
          updated_at: string
        }
        Insert: {
          context_used?: Json | null
          created_at?: string
          cross_sell?: string[] | null
          draft_text: string
          duration_text?: string | null
          id?: string
          obrtnik_id: string
          povprasevanje_id?: string | null
          price_max?: number | null
          price_min?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          context_used?: Json | null
          created_at?: string
          cross_sell?: string[] | null
          draft_text?: string
          duration_text?: string | null
          id?: string
          obrtnik_id?: string
          povprasevanje_id?: string | null
          price_max?: number | null
          price_min?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_quote_drafts_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_quote_drafts_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_quote_drafts_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "agent_quote_drafts_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_quote_drafts_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_quote_drafts_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "agent_quote_drafts_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_quote_drafts_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_quote_drafts_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_user_memory: {
        Row: {
          preferences: Json
          recent_activity: Json
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          preferences?: Json
          recent_activity?: Json
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          preferences?: Json
          recent_activity?: Json
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agent_conversations: {
        Row: {
          agent_type: string
          context: Json | null
          created_at: string | null
          id: string
          messages: Json
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_type: string
          context?: Json | null
          created_at?: string | null
          id?: string
          messages?: Json
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_type?: string
          context?: Json | null
          created_at?: string | null
          id?: string
          messages?: Json
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          agent_type: string | null
          cost_usd: number
          created_at: string | null
          id: string
          inquiry_id: string | null
          led_to_inquiry: boolean | null
          message_hash: string | null
          model_used: string
          rag_context_used: boolean | null
          rag_sources_count: number | null
          response_cached: boolean | null
          response_time_ms: number | null
          tokens_cached: number | null
          tokens_input: number
          tokens_output: number
          tool_calls_count: number | null
          user_id: string
          user_message: string | null
        }
        Insert: {
          agent_type?: string | null
          cost_usd?: number
          created_at?: string | null
          id?: string
          inquiry_id?: string | null
          led_to_inquiry?: boolean | null
          message_hash?: string | null
          model_used: string
          rag_context_used?: boolean | null
          rag_sources_count?: number | null
          response_cached?: boolean | null
          response_time_ms?: number | null
          tokens_cached?: number | null
          tokens_input?: number
          tokens_output?: number
          tool_calls_count?: number | null
          user_id: string
          user_message?: string | null
        }
        Update: {
          agent_type?: string | null
          cost_usd?: number
          created_at?: string | null
          id?: string
          inquiry_id?: string | null
          led_to_inquiry?: boolean | null
          message_hash?: string | null
          model_used?: string
          rag_context_used?: boolean | null
          rag_sources_count?: number | null
          response_cached?: boolean | null
          response_time_ms?: number | null
          tokens_cached?: number | null
          tokens_input?: number
          tokens_output?: number
          tool_calls_count?: number | null
          user_id?: string
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_log: {
        Row: {
          alert_type: string
          channels_notified: string[] | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          channels_notified?: string[] | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity: string
        }
        Update: {
          alert_type?: string
          channels_notified?: string[] | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          category_id: string | null
          commission: number | null
          created_at: string | null
          event: string
          final_price: number | null
          gross: number | null
          id: string
          net: number | null
          occurred_at: string
          partner_id: string | null
          price: number | null
          region_lat: number | null
          region_lng: number | null
          task_id: string | null
          top_score: number | null
        }
        Insert: {
          category_id?: string | null
          commission?: number | null
          created_at?: string | null
          event: string
          final_price?: number | null
          gross?: number | null
          id?: string
          net?: number | null
          occurred_at: string
          partner_id?: string | null
          price?: number | null
          region_lat?: number | null
          region_lng?: number | null
          task_id?: string | null
          top_score?: number | null
        }
        Update: {
          category_id?: string | null
          commission?: number | null
          created_at?: string | null
          event?: string
          final_price?: number | null
          gross?: number | null
          id?: string
          net?: number | null
          occurred_at?: string
          partner_id?: string | null
          price?: number | null
          region_lat?: number | null
          region_lng?: number | null
          task_id?: string | null
          top_score?: number | null
        }
        Relationships: []
      }
      assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          status: string | null
          task_id: string
          worker_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string | null
          task_id: string
          worker_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string | null
          task_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "zaposleni"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      conversation: {
        Row: {
          closed_at: string | null
          contact_revealed_at: string | null
          created_at: string
          id: string
          last_message_at: string | null
          participant_craftworker_sid: string | null
          participant_customer_sid: string | null
          status: string
          twilio_conversation_sid: string
        }
        Insert: {
          closed_at?: string | null
          contact_revealed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_craftworker_sid?: string | null
          participant_customer_sid?: string | null
          status?: string
          twilio_conversation_sid: string
        }
        Update: {
          closed_at?: string | null
          contact_revealed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_craftworker_sid?: string | null
          participant_customer_sid?: string | null
          status?: string
          twilio_conversation_sid?: string
        }
        Relationships: []
      }
      craftworker_profile: {
        Row: {
          avg_rating: number
          bypass_warnings: number
          commission_override: number | null
          commission_rate: number
          created_at: string
          id: string
          is_suspended: boolean
          is_verified: boolean
          loyalty_points: number
          package_type: string
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
          suspended_at: string | null
          suspended_reason: string | null
          total_jobs_completed: number
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          avg_rating?: number
          bypass_warnings?: number
          commission_override?: number | null
          commission_rate?: number
          created_at?: string
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          loyalty_points?: number
          package_type?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          total_jobs_completed?: number
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          avg_rating?: number
          bypass_warnings?: number
          commission_override?: number | null
          commission_rate?: number
          created_at?: string
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          loyalty_points?: number
          package_type?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          total_jobs_completed?: number
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "craftworker_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      data_records: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      escrow_holds: {
        Row: {
          amount: number
          created_at: string | null
          held_at: string | null
          id: string
          payment_intent_id: string | null
          released_at: string | null
          status: string
          task_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          held_at?: string | null
          id?: string
          payment_intent_id?: string | null
          released_at?: string | null
          status?: string
          task_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          held_at?: string | null
          id?: string
          payment_intent_id?: string | null
          released_at?: string | null
          status?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_holds_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_dlq: {
        Row: {
          attempt_count: number | null
          event_name: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          original_outbox_id: string | null
          payload: Json
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          attempt_count?: number | null
          event_name: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          original_outbox_id?: string | null
          payload: Json
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          attempt_count?: number | null
          event_name?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          original_outbox_id?: string | null
          payload?: Json
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_dlq_original_outbox_id_fkey"
            columns: ["original_outbox_id"]
            isOneToOne: false
            referencedRelation: "event_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      event_log: {
        Row: {
          emitted_at: string | null
          event_name: string
          id: string
          payload: Json
        }
        Insert: {
          emitted_at?: string | null
          event_name: string
          id?: string
          payload: Json
        }
        Update: {
          emitted_at?: string | null
          event_name?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      event_outbox: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          event_name: string
          id: string
          idempotency_key: string
          last_error: string | null
          next_attempt_at: string | null
          payload: Json
          processed_at: string | null
          status: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          event_name: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          next_attempt_at?: string | null
          payload: Json
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          event_name?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          next_attempt_at?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      event_processing_log: {
        Row: {
          consumer: string
          entity_id: string
          event_name: string
          id: string
          idempotency_key: string
          processed_at: string | null
        }
        Insert: {
          consumer: string
          entity_id: string
          event_name: string
          id?: string
          idempotency_key: string
          processed_at?: string | null
        }
        Update: {
          consumer?: string
          entity_id?: string
          event_name?: string
          id?: string
          idempotency_key?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      hitl_approvals: {
        Row: {
          agent_name: string
          approver_id: string | null
          approver_note: string | null
          context: Json
          created_at: string
          description: string
          execution_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_name: string
          approver_id?: string | null
          approver_note?: string | null
          context?: Json
          created_at?: string
          description: string
          execution_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_name?: string
          approver_id?: string | null
          approver_note?: string | null
          context?: Json
          created_at?: string
          description?: string
          execution_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          created_at: string
          description: string
          email: string
          id: string
          location: string
          phone: string
          preferred_date: string | null
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          email: string
          id?: string
          location: string
          phone: string
          preferred_date?: string | null
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          email?: string
          id?: string
          location?: string
          phone?: string
          preferred_date?: string | null
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      job: {
        Row: {
          category: string
          city: string
          completed_at: string | null
          conversation_id: string | null
          craftworker_id: string | null
          created_at: string
          customer_id: string
          description: string
          estimated_value: number | null
          id: string
          payment_id: string | null
          risk_score: number
          status: string
          title: string
          twilio_conversation_sid: string | null
          updated_at: string
        }
        Insert: {
          category: string
          city: string
          completed_at?: string | null
          conversation_id?: string | null
          craftworker_id?: string | null
          created_at?: string
          customer_id: string
          description: string
          estimated_value?: number | null
          id?: string
          payment_id?: string | null
          risk_score?: number
          status?: string
          title: string
          twilio_conversation_sid?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          city?: string
          completed_at?: string | null
          conversation_id?: string | null
          craftworker_id?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          estimated_value?: number | null
          id?: string
          payment_id?: string | null
          risk_score?: number
          status?: string
          title?: string
          twilio_conversation_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_craftworker_id_fkey"
            columns: ["craftworker_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string | null
          id: string
          last_error: string | null
          payload: Json
          status: string
          type: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          status?: string
          type: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          status?: string
          type?: string
        }
        Relationships: []
      }
      job_reports: {
        Row: {
          ai_summary: string | null
          ai_summary_sl: string | null
          created_at: string
          customer_confirmed_at: string | null
          duration_hours: number | null
          id: string
          materials_used: Json | null
          notes: string | null
          obrtnik_id: string
          photos: string[] | null
          ponudba_id: string | null
          povprasevanje_id: string | null
          sent_to_customer: boolean | null
          status: string
          title: string
          total_cost: number | null
          updated_at: string
          warranty_expires_at: string | null
          warranty_months: number | null
          work_performed: string | null
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_sl?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          duration_hours?: number | null
          id?: string
          materials_used?: Json | null
          notes?: string | null
          obrtnik_id: string
          photos?: string[] | null
          ponudba_id?: string | null
          povprasevanje_id?: string | null
          sent_to_customer?: boolean | null
          status?: string
          title: string
          total_cost?: number | null
          updated_at?: string
          warranty_expires_at?: string | null
          warranty_months?: number | null
          work_performed?: string | null
        }
        Update: {
          ai_summary?: string | null
          ai_summary_sl?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          duration_hours?: number | null
          id?: string
          materials_used?: Json | null
          notes?: string | null
          obrtnik_id?: string
          photos?: string[] | null
          ponudba_id?: string | null
          povprasevanje_id?: string | null
          sent_to_customer?: boolean | null
          status?: string
          title?: string
          total_cost?: number | null
          updated_at?: string
          warranty_expires_at?: string | null
          warranty_months?: number | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "job_reports_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_reports_ponudba_id_fkey"
            columns: ["ponudba_id"]
            isOneToOne: false
            referencedRelation: "ponudbe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reports_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reports_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          partner_id: string | null
          request_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          request_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          request_id?: string
        }
        Relationships: []
      }
      matching_logs: {
        Row: {
          algorithm_version: string | null
          all_matches: Json | null
          created_at: string | null
          execution_time_ms: number | null
          id: string
          request_id: string
          top_partner_id: string | null
          top_partner_tier: string | null
          top_score: number | null
        }
        Insert: {
          algorithm_version?: string | null
          all_matches?: Json | null
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          request_id: string
          top_partner_id?: string | null
          top_partner_tier?: string | null
          top_score?: number | null
        }
        Update: {
          algorithm_version?: string | null
          all_matches?: Json | null
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          request_id?: string
          top_partner_id?: string | null
          top_partner_tier?: string | null
          top_score?: number | null
        }
        Relationships: []
      }
      materials_lists: {
        Row: {
          ai_generated: boolean | null
          created_at: string
          currency: string | null
          id: string
          items: Json
          job_report_id: string | null
          obrtnik_id: string
          povprasevanje_id: string | null
          status: string | null
          title: string
          total_estimated: number | null
        }
        Insert: {
          ai_generated?: boolean | null
          created_at?: string
          currency?: string | null
          id?: string
          items?: Json
          job_report_id?: string | null
          obrtnik_id: string
          povprasevanje_id?: string | null
          status?: string | null
          title: string
          total_estimated?: number | null
        }
        Update: {
          ai_generated?: boolean | null
          created_at?: string
          currency?: string | null
          id?: string
          items?: Json
          job_report_id?: string | null
          obrtnik_id?: string
          povprasevanje_id?: string | null
          status?: string | null
          title?: string
          total_estimated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_lists_job_report_id_fkey"
            columns: ["job_report_id"]
            isOneToOne: false
            referencedRelation: "job_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "materials_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "materials_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "materials_lists_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "materials_lists_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_lists_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      message: {
        Row: {
          blocked_reason: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_blocked: boolean
          sender_user_id: string
          twilio_message_sid: string | null
        }
        Insert: {
          blocked_reason?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          sender_user_id: string
          twilio_message_sid?: string | null
        }
        Update: {
          blocked_reason?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          sender_user_id?: string
          twilio_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          channel: string | null
          created_at: string | null
          data: Json | null
          id: string
          message: string | null
          read: boolean | null
          title: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          channel?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          body?: string | null
          channel?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      obrtnik_availability: {
        Row: {
          day_of_week: number
          id: string
          is_available: boolean | null
          obrtnik_id: string
          time_from: string
          time_to: string
        }
        Insert: {
          day_of_week: number
          id?: string
          is_available?: boolean | null
          obrtnik_id: string
          time_from?: string
          time_to?: string
        }
        Update: {
          day_of_week?: number
          id?: string
          is_available?: boolean | null
          obrtnik_id?: string
          time_from?: string
          time_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "obrtnik_availability_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_availability_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_availability_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "obrtnik_availability_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "obrtnik_availability_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_availability_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "obrtnik_availability_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      obrtnik_categories: {
        Row: {
          category_id: string
          created_at: string
          obrtnik_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          obrtnik_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          obrtnik_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obrtnik_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_categories_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_categories_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_categories_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "obrtnik_categories_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "obrtnik_categories_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_categories_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "obrtnik_categories_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      obrtnik_profiles: {
        Row: {
          ajpes_id: string | null
          avg_rating: number | null
          business_name: string
          created_at: string
          description: string | null
          embedding: string | null
          embedding_updated_at: string | null
          enable_instant_offers: boolean | null
          facebook_url: string | null
          hourly_rate: number | null
          id: string
          instagram_url: string | null
          instant_offer_templates: Json | null
          is_available: boolean
          is_verified: boolean
          phone: string | null
          portfolio_cover_url: string | null
          response_time_hours: number | null
          service_radius_km: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier: string
          tagline: string | null
          total_reviews: number | null
          verification_status: string
          website_url: string | null
          working_since: string | null
          years_experience: number | null
        }
        Insert: {
          ajpes_id?: string | null
          avg_rating?: number | null
          business_name: string
          created_at?: string
          description?: string | null
          embedding?: string | null
          embedding_updated_at?: string | null
          enable_instant_offers?: boolean | null
          facebook_url?: string | null
          hourly_rate?: number | null
          id: string
          instagram_url?: string | null
          instant_offer_templates?: Json | null
          is_available?: boolean
          is_verified?: boolean
          phone?: string | null
          portfolio_cover_url?: string | null
          response_time_hours?: number | null
          service_radius_km?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string
          tagline?: string | null
          total_reviews?: number | null
          verification_status?: string
          website_url?: string | null
          working_since?: string | null
          years_experience?: number | null
        }
        Update: {
          ajpes_id?: string | null
          avg_rating?: number | null
          business_name?: string
          created_at?: string
          description?: string | null
          embedding?: string | null
          embedding_updated_at?: string | null
          enable_instant_offers?: boolean | null
          facebook_url?: string | null
          hourly_rate?: number | null
          id?: string
          instagram_url?: string | null
          instant_offer_templates?: Json | null
          is_available?: boolean
          is_verified?: boolean
          phone?: string | null
          portfolio_cover_url?: string | null
          response_time_hours?: number | null
          service_radius_km?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string
          tagline?: string | null
          total_reviews?: number | null
          verification_status?: string
          website_url?: string | null
          working_since?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obrtnik_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      obrtnik_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          obrtnik_id: string
          rating: number | null
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          obrtnik_id: string
          rating?: number | null
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          obrtnik_id?: string
          rating?: number | null
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obrtnik_reviews_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_reviews_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_reviews_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "obrtnik_reviews_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "obrtnik_reviews_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_reviews_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "obrtnik_reviews_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "obrtnik_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ocene: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_public: boolean
          narocnik_id: string
          obrtnik_id: string
          obrtnik_reply: string | null
          photos: string[] | null
          ponudba_id: string
          price_rating: number | null
          punctuality_rating: number | null
          quality_rating: number | null
          rating: number
          replied_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          narocnik_id: string
          obrtnik_id: string
          obrtnik_reply?: string | null
          photos?: string[] | null
          ponudba_id: string
          price_rating?: number | null
          punctuality_rating?: number | null
          quality_rating?: number | null
          rating: number
          replied_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          narocnik_id?: string
          obrtnik_id?: string
          obrtnik_reply?: string | null
          photos?: string[] | null
          ponudba_id?: string
          price_rating?: number | null
          punctuality_rating?: number | null
          quality_rating?: number | null
          rating?: number
          replied_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocene_narocnik_id_fkey"
            columns: ["narocnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocene_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocene_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocene_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "ocene_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ocene_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocene_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "ocene_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ocene_ponudba_id_fkey"
            columns: ["ponudba_id"]
            isOneToOne: true
            referencedRelation: "ponudbe"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string | null
          description: string
          estimated_duration: string | null
          id: string
          notes: string | null
          partner_id: string
          payment_confirmed_at: string | null
          payment_intent_id: string | null
          payment_status: string | null
          price: number | null
          request_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          estimated_duration?: string | null
          id?: string
          notes?: string | null
          partner_id: string
          payment_confirmed_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          price?: number | null
          request_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          estimated_duration?: string | null
          id?: string
          notes?: string | null
          partner_id?: string
          payment_confirmed_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          price?: number | null
          request_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_paketi: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          obrtnik_id: string
          paket: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          obrtnik_id: string
          paket?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          obrtnik_id?: string
          paket?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_paketi_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_paketi_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_paketi_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "partner_paketi_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_paketi_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_paketi_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "partner_paketi_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          company_name: string
          created_at: string | null
          description: string | null
          id: string
          migrated_at: string | null
          new_profile_id: string | null
          phone_number: string | null
          postal_code: string | null
          rating: number | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          subscription_plan: string | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          company_name: string
          created_at?: string | null
          description?: string | null
          id: string
          migrated_at?: string | null
          new_profile_id?: string | null
          phone_number?: string | null
          postal_code?: string | null
          rating?: number | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          subscription_plan?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          company_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          migrated_at?: string | null
          new_profile_id?: string | null
          phone_number?: string | null
          postal_code?: string | null
          rating?: number | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          subscription_plan?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_new_profile_id_fkey"
            columns: ["new_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment: {
        Row: {
          amount: number
          craftworker_payout: number
          created_at: string
          dispute_reason: string | null
          held_at: string | null
          id: string
          platform_fee: number
          refunded_at: string | null
          released_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          craftworker_payout: number
          created_at?: string
          dispute_reason?: string | null
          held_at?: string | null
          id?: string
          platform_fee: number
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          craftworker_payout?: number
          created_at?: string
          dispute_reason?: string | null
          held_at?: string | null
          id?: string
          platform_fee?: number
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          craftsman_id: string
          created_at: string | null
          id: string
          offer_id: string | null
          stripe_transfer_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          craftsman_id: string
          created_at?: string | null
          id?: string
          offer_id?: string | null
          stripe_transfer_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          craftsman_id?: string
          created_at?: string | null
          id?: string
          offer_id?: string | null
          stripe_transfer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      ponudbe: {
        Row: {
          accepted_at: string | null
          attachments: string[] | null
          available_date: string | null
          created_at: string
          embedding: string | null
          embedding_updated_at: string | null
          estimated_duration: string | null
          id: string
          message: string
          obrtnik_id: string
          povprasevanje_id: string
          price_estimate: number | null
          price_type: string
          status: string
          validity_days: number | null
        }
        Insert: {
          accepted_at?: string | null
          attachments?: string[] | null
          available_date?: string | null
          created_at?: string
          embedding?: string | null
          embedding_updated_at?: string | null
          estimated_duration?: string | null
          id?: string
          message: string
          obrtnik_id: string
          povprasevanje_id: string
          price_estimate?: number | null
          price_type?: string
          status?: string
          validity_days?: number | null
        }
        Update: {
          accepted_at?: string | null
          attachments?: string[] | null
          available_date?: string | null
          created_at?: string
          embedding?: string | null
          embedding_updated_at?: string | null
          estimated_duration?: string | null
          id?: string
          message?: string
          obrtnik_id?: string
          povprasevanje_id?: string
          price_estimate?: number | null
          price_type?: string
          status?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ponudbe_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponudbe_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponudbe_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "ponudbe_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ponudbe_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponudbe_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "ponudbe_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ponudbe_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponudbe_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          id: string
          image_urls: string[] | null
          is_featured: boolean | null
          location_city: string | null
          obrtnik_id: string
          price_approx: number | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          image_urls?: string[] | null
          is_featured?: boolean | null
          location_city?: string | null
          obrtnik_id: string
          price_approx?: number | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          image_urls?: string[] | null
          is_featured?: boolean | null
          location_city?: string | null
          obrtnik_id?: string
          price_approx?: number | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "portfolio_items_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_items_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "portfolio_items_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      povprasevanja: {
        Row: {
          attachments: string[] | null
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          lat: number | null
          lng: number | null
          location_city: string
          location_notes: string | null
          location_region: string | null
          narocnik_id: string | null
          notified_at: string | null
          obrtnik_id: string | null
          preferred_date_from: string | null
          preferred_date_to: string | null
          status: string
          stranka_email: string | null
          stranka_telefon: string | null
          title: string
          updated_at: string
          urgency: string | null
        }
        Insert: {
          attachments?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_city: string
          location_notes?: string | null
          location_region?: string | null
          narocnik_id?: string | null
          notified_at?: string | null
          obrtnik_id?: string | null
          preferred_date_from?: string | null
          preferred_date_to?: string | null
          status?: string
          stranka_email?: string | null
          stranka_telefon?: string | null
          title: string
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          attachments?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_city?: string
          location_notes?: string | null
          location_region?: string | null
          narocnik_id?: string | null
          notified_at?: string | null
          obrtnik_id?: string | null
          preferred_date_from?: string | null
          preferred_date_to?: string | null
          status?: string
          stranka_email?: string | null
          stranka_telefon?: string | null
          title?: string
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "povprasevanja_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "povprasevanja_narocnik_id_fkey"
            columns: ["narocnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_messages_reset_at: string | null
          ai_messages_used_today: number | null
          ai_total_cost_usd: number | null
          ai_total_tokens_used: number | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_suspended: boolean
          last_name: string | null
          location_city: string | null
          location_region: string | null
          phone: string | null
          role: string | null
          stripe_customer_id: string | null
          subscription_tier: string
        }
        Insert: {
          ai_messages_reset_at?: string | null
          ai_messages_used_today?: number | null
          ai_total_cost_usd?: number | null
          ai_total_tokens_used?: number | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_suspended?: boolean
          last_name?: string | null
          location_city?: string | null
          location_region?: string | null
          phone?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string
        }
        Update: {
          ai_messages_reset_at?: string | null
          ai_messages_used_today?: number | null
          ai_total_cost_usd?: number | null
          ai_total_tokens_used?: number | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          last_name?: string | null
          location_city?: string | null
          location_region?: string | null
          phone?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string | null
          user_id: string | null
        }
        Insert: {
          auth?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      risk_scores: {
        Row: {
          alert_level: string | null
          checked_at: string | null
          flags: string[] | null
          id: string
          povprasevanje_id: string
          score: number
          triggered_alert: boolean | null
        }
        Insert: {
          alert_level?: string | null
          checked_at?: string | null
          flags?: string[] | null
          id?: string
          povprasevanje_id: string
          score?: number
          triggered_alert?: boolean | null
        }
        Update: {
          alert_level?: string | null
          checked_at?: string | null
          flags?: string[] | null
          id?: string
          povprasevanje_id?: string
          score?: number
          triggered_alert?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_scores_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: true
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_scores_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: true
            referencedRelation: "povprasevanja_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      saga_instances: {
        Row: {
          compensation_log: Json | null
          completed_steps: Json | null
          created_at: string | null
          current_step: number | null
          error_message: string | null
          id: string
          saga_type: string
          status: string | null
          task_id: string
          updated_at: string | null
        }
        Insert: {
          compensation_log?: Json | null
          completed_steps?: Json | null
          created_at?: string | null
          current_step?: number | null
          error_message?: string | null
          id?: string
          saga_type: string
          status?: string | null
          task_id: string
          updated_at?: string | null
        }
        Update: {
          compensation_log?: Json | null
          completed_steps?: Json | null
          created_at?: string | null
          current_step?: number | null
          error_message?: string | null
          id?: string
          saga_type?: string
          status?: string | null
          task_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_areas: {
        Row: {
          city: string
          created_at: string | null
          id: string
          is_active: boolean | null
          lat: number | null
          lng: number | null
          obrtnik_id: string
          radius_km: number | null
          region: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          obrtnik_id: string
          radius_km?: number | null
          region?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          obrtnik_id?: string
          radius_km?: number | null
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_areas_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_areas_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "obrtnik_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_areas_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["obrtnik_id"]
          },
          {
            foreignKeyName: "service_areas_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_areas_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_areas_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["new_profile_id"]
          },
          {
            foreignKeyName: "service_areas_obrtnik_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: false
            referencedRelation: "partners_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      service_requests: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          location_city: string
          narocnik_id: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location_city: string
          narocnik_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location_city?: string
          narocnik_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_narocnik_id_fkey"
            columns: ["narocnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sporocila: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          embedding: string | null
          embedding_updated_at: string | null
          id: string
          is_read: boolean | null
          message: string
          povprasevanje_id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          embedding?: string | null
          embedding_updated_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          povprasevanje_id: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          embedding?: string | null
          embedding_updated_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          povprasevanje_id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sporocila_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sporocila_povprasevanje_id_fkey"
            columns: ["povprasevanje_id"]
            isOneToOne: false
            referencedRelation: "povprasevanja_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      task_events: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          task_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          task_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_locks: {
        Row: {
          locked_at: string | null
          task_id: string
          worker_id: string
        }
        Insert: {
          locked_at?: string | null
          task_id: string
          worker_id: string
        }
        Update: {
          locked_at?: string | null
          task_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_locks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_queue_jobs: {
        Row: {
          attempt_count: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          max_attempts: number | null
          next_attempt_at: string | null
          payload: Json
          status: string | null
        }
        Insert: {
          attempt_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          max_attempts?: number | null
          next_attempt_at?: string | null
          payload: Json
          status?: string | null
        }
        Update: {
          attempt_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          max_attempts?: number | null
          next_attempt_at?: string | null
          payload?: Json
          status?: string | null
        }
        Relationships: []
      }
      task_sla: {
        Row: {
          deadline_at: string | null
          escalated: boolean | null
          published_at: string | null
          task_id: string
        }
        Insert: {
          deadline_at?: string | null
          escalated?: boolean | null
          published_at?: string | null
          task_id: string
        }
        Update: {
          deadline_at?: string | null
          escalated?: boolean | null
          published_at?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_sla_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          accepted_at: string | null
          assigned_to: string | null
          cancelled_at: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          customer_id: string | null
          description: string | null
          embedding: string | null
          embedding_updated_at: string | null
          expired_at: string | null
          expires_at: string | null
          id: string
          priority: string | null
          published_at: string | null
          sla_expires_at: string | null
          started_at: string | null
          status: string
          title: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_to?: string | null
          cancelled_at?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          customer_id?: string | null
          description?: string | null
          embedding?: string | null
          embedding_updated_at?: string | null
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          priority?: string | null
          published_at?: string | null
          sla_expires_at?: string | null
          started_at?: string | null
          status?: string
          title: string
        }
        Update: {
          accepted_at?: string | null
          assigned_to?: string | null
          cancelled_at?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          customer_id?: string | null
          description?: string | null
          embedding?: string | null
          embedding_updated_at?: string | null
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          priority?: string | null
          published_at?: string | null
          sla_expires_at?: string | null
          started_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          role?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      violation: {
        Row: {
          action_taken: string | null
          created_at: string
          detected_content: string
          id: string
          is_reviewed: boolean
          job_id: string | null
          message_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          type: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          detected_content: string
          id?: string
          is_reviewed?: boolean
          job_id?: string | null
          message_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity: string
          type: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          detected_content?: string
          id?: string
          is_reviewed?: boolean
          job_id?: string | null
          message_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "violation_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violation_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "message"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      zaposleni: {
        Row: {
          aktiven: boolean
          availability: Json | null
          createdAt: string
          createdBy: string | null
          email: string
          id: string
          ime: string
          location: string | null
          max_distance: number | null
          priimek: string
          skills: string[] | null
          updatedAt: string
          vloga: Database["public"]["Enums"]["Vloga"]
        }
        Insert: {
          aktiven?: boolean
          availability?: Json | null
          createdAt?: string
          createdBy?: string | null
          email: string
          id?: string
          ime: string
          location?: string | null
          max_distance?: number | null
          priimek: string
          skills?: string[] | null
          updatedAt?: string
          vloga?: Database["public"]["Enums"]["Vloga"]
        }
        Update: {
          aktiven?: boolean
          availability?: Json | null
          createdAt?: string
          createdBy?: string | null
          email?: string
          id?: string
          ime?: string
          location?: string | null
          max_distance?: number | null
          priimek?: string
          skills?: string[] | null
          updatedAt?: string
          vloga?: Database["public"]["Enums"]["Vloga"]
        }
        Relationships: []
      }
    }
    Views: {
      ai_usage_analytics: {
        Row: {
          cached_messages: number | null
          date: string | null
          haiku_cost: number | null
          haiku_count: number | null
          sonnet_cost: number | null
          sonnet_count: number | null
          total_cost_usd: number | null
          total_messages: number | null
          total_tokens_input: number | null
          total_tokens_output: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      obrtnik_public_view: {
        Row: {
          avatar_url: string | null
          avg_rating: number | null
          business_name: string | null
          description: string | null
          first_name: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string | null
          is_available: boolean | null
          is_verified: boolean | null
          last_name: string | null
          location_city: string | null
          location_region: string | null
          phone: string | null
          portfolio_cover_url: string | null
          response_time_hours: number | null
          service_radius_km: number | null
          subscription_tier: string | null
          tagline: string | null
          total_reviews: number | null
          website_url: string | null
          working_since: string | null
          years_experience: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obrtnik_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_accounts: {
        Row: {
          avg_rating: number | null
          business_name: string | null
          created_at: string | null
          description: string | null
          email: string | null
          first_name: string | null
          is_available: boolean | null
          is_verified: boolean | null
          last_name: string | null
          location_city: string | null
          obrtnik_id: string | null
          paket: string | null
          phone: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          total_reviews: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obrtnik_profiles_id_fkey"
            columns: ["obrtnik_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_profiles_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners_view: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          migrated_at: string | null
          new_profile_id: string | null
          phone_number: string | null
          postal_code: string | null
          rating: number | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          subscription_plan: string | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
          website: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obrtnik_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_profiles_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obrtnik_profiles_id_fkey"
            columns: ["new_profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      povprasevanja_with_stats: {
        Row: {
          attachments: string[] | null
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          lat: number | null
          lng: number | null
          location_city: string | null
          location_notes: string | null
          location_region: string | null
          max_price: number | null
          min_price: number | null
          narocnik_id: string | null
          notified_at: string | null
          obrtnik_id: string | null
          ponudbe_count: number | null
          preferred_date_from: string | null
          preferred_date_to: string | null
          sprejete_count: number | null
          status: string | null
          stranka_email: string | null
          stranka_telefon: string | null
          title: string | null
          updated_at: string | null
          urgency: string | null
        }
        Relationships: [
          {
            foreignKeyName: "povprasevanja_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "povprasevanja_narocnik_id_fkey"
            columns: ["narocnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_agent_cost_by_day: {
        Row: {
          agent_type: string | null
          cost_usd: number | null
          date: string | null
          messages: number | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Relationships: []
      }
      v_agent_cost_by_tier: {
        Row: {
          agent_type: string | null
          cost_usd: number | null
          date: string | null
          messages: number | null
          subscription_tier: string | null
          tokens_in: number | null
          tokens_out: number | null
          users: number | null
        }
        Relationships: []
      }
      v_agent_jobs_stats: {
        Row: {
          agent_type: string | null
          avg_duration_sec: number | null
          count: number | null
          day: string | null
          job_type: string | null
          status: string | null
          total_cost_usd: number | null
          total_tokens: number | null
        }
        Relationships: []
      }
      v_ai_daily_usage: {
        Row: {
          agent_type: string | null
          avg_response_time_ms: number | null
          call_count: number | null
          total_cost: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_tool_calls: number | null
          usage_date: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ai_daily_usage_admin: {
        Row: {
          agent_type: string | null
          avg_response_time_ms: number | null
          call_count: number | null
          total_cost: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_tool_calls: number | null
          usage_date: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_top_cost_users: {
        Row: {
          email: string | null
          first_name: string | null
          last_active: string | null
          last_name: string | null
          subscription_tier: string | null
          total_cost_usd: number | null
          total_messages: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_cost_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_task:
        | { Args: { p_task_id: string; p_worker_id: string }; Returns: boolean }
        | { Args: { p_task_id: string; p_worker_id: string }; Returns: boolean }
      claim_task:
        | {
            Args: { p_task_id: string; p_worker_id: string }
            Returns: undefined
          }
        | { Args: { p_task_id: string; p_worker_id: string }; Returns: boolean }
      complete_task:
        | { Args: { p_task_id: string; p_worker_id: string }; Returns: boolean }
        | { Args: { p_task_id: string; p_worker_id: string }; Returns: boolean }
      expire_tasks: { Args: never; Returns: undefined }
      f_ai_daily_usage_admin: {
        Args: never
        Returns: {
          agent_type: string
          avg_response_time_ms: number
          call_count: number
          total_cost: number
          total_input_tokens: number
          total_output_tokens: number
          total_tool_calls: number
          usage_date: string
          user_id: string
        }[]
      }
      get_obrtnik_with_categories: {
        Args: { obrtnik_uuid: string }
        Returns: {
          avg_rating: number
          business_name: string
          categories: Json
          id: string
          total_reviews: number
        }[]
      }
      github_create_file: {
        Args: {
          p_branch?: string
          p_content: string
          p_message?: string
          p_owner: string
          p_path: string
          p_repo: string
        }
        Returns: {
          request_id: number
        }[]
      }
      github_create_file_direct: {
        Args: {
          p_branch?: string
          p_content: string
          p_message?: string
          p_owner: string
          p_path: string
          p_repo: string
          p_token: string
        }
        Returns: {
          request_id: number
        }[]
      }
      github_encode_path: { Args: { p_path: string }; Returns: string }
      hybrid_search_tasks: {
        Args: {
          keyword_weight?: number
          match_count?: number
          query_embedding: string
          query_text: string
          semantic_weight?: number
        }
        Returns: {
          category_id: string
          combined_score: number
          description: string
          id: string
          status: string
          title: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      match_obrtniki: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          avg_rating: number
          business_name: string
          description: string
          id: string
          is_available: boolean
          similarity: number
          tagline: string
        }[]
      }
      match_ponudbe: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          task_id?: string
        }
        Returns: {
          id: string
          message: string
          obrtnik_id: string
          povprasevanje_id: string
          price_estimate: number
          similarity: number
          status: string
        }[]
      }
      match_sporocila: {
        Args: {
          conversation_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          created_at: string
          id: string
          message: string
          povprasevanje_id: string
          sender_id: string
          similarity: number
        }[]
      }
      match_tasks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category_id: string
          description: string
          id: string
          similarity: number
          status: string
          title: string
        }[]
      }
      publish_task:
        | {
            Args: { p_actor_id: string; p_task_id: string }
            Returns: undefined
          }
        | {
            Args: { p_actor_id: string; p_task_id: string }
            Returns: undefined
          }
      refresh_ai_analytics: { Args: never; Returns: undefined }
      start_task:
        | { Args: { p_task_id: string; p_worker_id: string }; Returns: boolean }
        | { Args: { p_task_id: string; p_worker_id: string }; Returns: boolean }
      upsert_agent_cost_summary: {
        Args: {
          p_agent_type: string
          p_cost_usd: number
          p_tokens_in: number
          p_tokens_out: number
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      admin_role: "SUPER_ADMIN" | "MODERATOR" | "OPERATER"
      Vloga: "SUPER_ADMIN" | "MODERATOR" | "OPERATER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_role: ["SUPER_ADMIN", "MODERATOR", "OPERATER"],
      Vloga: ["SUPER_ADMIN", "MODERATOR", "OPERATER"],
    },
  },
} as const

