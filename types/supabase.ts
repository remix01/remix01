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
          stripeCustomerId: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: Omit<Database['public']['Tables']['user']['Row'], 'createdAt' | 'updatedAt'>
        Update: Partial<Database['public']['Tables']['user']['Insert']>
      }
      craftworker_profile: {
        Row: {
          id: string
          userId: string
          packageType: 'START' | 'PRO'
          commissionRate: number
          stripeAccountId: string | null
          stripeOnboardingComplete: boolean
          totalJobsCompleted: number
          avgRating: number
          isVerified: boolean
          verifiedAt: string | null
          loyaltyPoints: number
          bypassWarnings: number
          isSuspended: boolean
          suspendedAt: string | null
          suspendedReason: string | null
          commissionOverride: number | null
        }
        Insert: Omit<Database['public']['Tables']['craftworker_profile']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['craftworker_profile']['Insert']>
      }
      job: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          city: string
          estimatedValue: number | null
          status: 'PENDING' | 'MATCHED' | 'IN_PROGRESS' | 'AWAITING_CONFIRMATION' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED'
          customerId: string
          craftworkerId: string | null
          twilioConversationSid: string | null
          riskScore: number
          createdAt: string
          updatedAt: string
          completedAt: string | null
        }
        Insert: Omit<Database['public']['Tables']['job']['Row'], 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Database['public']['Tables']['job']['Insert']>
      }
      payment: {
        Row: {
          id: string
          jobId: string
          amount: number
          platformFee: number
          craftworkerPayout: number
          status: 'UNPAID' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTED'
          stripePaymentIntentId: string | null
          stripeTransferId: string | null
          heldAt: string | null
          releasedAt: string | null
          refundedAt: string | null
          disputeReason: string | null
        }
        Insert: Omit<Database['public']['Tables']['payment']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['payment']['Insert']>
      }
      conversation: {
        Row: {
          id: string
          jobId: string
          twilioConversationSid: string
          status: 'ACTIVE' | 'CLOSED' | 'SUSPENDED'
          participantCustomerSid: string | null
          participantCraftworkerSid: string | null
          contactRevealedAt: string | null
          lastMessageAt: string | null
          createdAt: string
          closedAt: string | null
        }
        Insert: Omit<Database['public']['Tables']['conversation']['Row'], 'id' | 'createdAt'>
        Update: Partial<Database['public']['Tables']['conversation']['Insert']>
      }
      message: {
        Row: {
          id: string
          conversationId: string
          senderUserId: string
          body: string
          isBlocked: boolean
          blockedReason: string | null
          sentAt: string
          twilioMessageSid: string | null
        }
        Insert: Omit<Database['public']['Tables']['message']['Row'], 'id' | 'sentAt'>
        Update: Partial<Database['public']['Tables']['message']['Insert']>
      }
      violation: {
        Row: {
          id: string
          jobId: string
          userId: string
          type: 'PHONE_DETECTED' | 'EMAIL_DETECTED' | 'BYPASS_ATTEMPT' | 'SUSPICIOUS_PATTERN'
          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          detectedContent: string
          messageId: string | null
          isReviewed: boolean
          reviewedBy: string | null
          reviewedAt: string | null
          actionTaken: string | null
          createdAt: string
        }
        Insert: Omit<Database['public']['Tables']['violation']['Row'], 'id' | 'createdAt'>
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
