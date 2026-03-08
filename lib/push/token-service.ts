import { supabaseAdmin } from '../supabase-admin'

export interface DeviceToken {
  id: string
  user_id: string
  token: string
  platform: 'ios' | 'android' | 'web'
  app_version?: string
  device_name?: string
  last_seen_at: string
  is_active: boolean
  created_at: string
}

export class TokenService {
  /**
   * Register or update a device token for push notifications
   */
  static async register(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
    appVersion?: string,
    deviceName?: string
  ): Promise<DeviceToken> {
    const { data, error } = await supabaseAdmin
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          app_version: appVersion,
          device_name: deviceName,
          last_seen_at: new Date().toISOString(),
          is_active: true,
        },
        {
          onConflict: 'token',
          ignoreDuplicates: false,
        }
      )
      .select()
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to register device token: ${error.message}`)
    }

    if (!data) {
      throw new Error('Failed to register device token: no data returned')
    }

    return data
  }

  /**
   * Deactivate a device token (e.g., when push fails)
   */
  static async deactivate(token: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('device_tokens')
      .update({ is_active: false })
      .eq('token', token)

    if (error) {
      console.error(`Failed to deactivate token: ${error.message}`)
    }
  }

  /**
   * Get all active tokens for a user
   */
  static async getForUser(userId: string): Promise<DeviceToken[]> {
    const { data, error } = await supabaseAdmin
      .from('device_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to get user tokens: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get all active tokens for multiple users (batch fetch)
   */
  static async getForUsers(userIds: string[]): Promise<Map<string, DeviceToken[]>> {
    const { data, error } = await supabaseAdmin
      .from('device_tokens')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to get tokens for users: ${error.message}`)
    }

    // Group tokens by user_id
    const tokensByUser = new Map<string, DeviceToken[]>()
    
    for (const token of data || []) {
      const existing = tokensByUser.get(token.user_id) || []
      tokensByUser.set(token.user_id, [...existing, token])
    }

    return tokensByUser
  }

  /**
   * Clean up inactive tokens older than 90 days
   */
  static async cleanupOldTokens(): Promise<number> {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data, error } = await supabaseAdmin
      .from('device_tokens')
      .delete()
      .eq('is_active', false)
      .lt('last_seen_at', ninetyDaysAgo.toISOString())
      .select('id')

    if (error) {
      console.error(`Failed to cleanup old tokens: ${error.message}`)
      return 0
    }

    return data?.length || 0
  }
}
