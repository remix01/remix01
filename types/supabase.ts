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
      User: {
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
        Insert: Omit<Database['public']['Tables']['User']['Row'], 'createdAt' | 'updatedAt'>
        Update: Partial<Database['public']['Tables']['User']['Insert']>
      }
      CraftworkerProfile: {
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
        }
        Insert: Omit<Database['public']['Tables']['CraftworkerProfile']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['CraftworkerProfile']['Insert']>
      }
      Job: {
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
        Insert: Omit<Database['public']['Tables']['Job']['Row'], 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Database['public']['Tables']['Job']['Insert']>
      }
      Payment: {
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
        Insert: Omit<Database['public']['Tables']['Payment']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['Payment']['Insert']>
      }
      Conversation: {
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
        Insert: Omit<Database['public']['Tables']['Conversation']['Row'], 'id' | 'createdAt'>
        Update: Partial<Database['public']['Tables']['Conversation']['Insert']>
      }
      Message: {
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
        Insert: Omit<Database['public']['Tables']['Message']['Row'], 'id' | 'sentAt'>
        Update: Partial<Database['public']['Tables']['Message']['Insert']>
      }
      Violation: {
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
        Insert: Omit<Database['public']['Tables']['Violation']['Row'], 'id' | 'createdAt'>
        Update: Partial<Database['public']['Tables']['Violation']['Insert']>
      }
      RiskScore: {
        Row: {
          id: string
          jobId: string
          score: number
          flags: Json
          calculatedAt: string
          triggeredAlert: boolean
        }
        Insert: Omit<Database['public']['Tables']['RiskScore']['Row'], 'id' | 'calculatedAt'>
        Update: Partial<Database['public']['Tables']['RiskScore']['Insert']>
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
