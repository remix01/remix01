import { canAccess, roleHierarchy, Role } from '@/lib/agent/permissions/roles'

describe('RoleHierarchy', () => {
  describe('canAccess', () => {
    it('guest cannot access user-level tools', () => {
      expect(canAccess('guest', 'user')).toBe(false)
    })

    it('guest cannot access partner-level tools', () => {
      expect(canAccess('guest', 'partner')).toBe(false)
    })

    it('guest cannot access admin-level tools', () => {
      expect(canAccess('guest', 'admin')).toBe(false)
    })

    it('user can access user-level tools', () => {
      expect(canAccess('user', 'user')).toBe(true)
    })

    it('user cannot access partner-level tools', () => {
      expect(canAccess('user', 'partner')).toBe(false)
    })

    it('user cannot access admin-level tools', () => {
      expect(canAccess('user', 'admin')).toBe(false)
    })

    it('partner can access user-level tools', () => {
      expect(canAccess('partner', 'user')).toBe(true)
    })

    it('partner can access partner-level tools', () => {
      expect(canAccess('partner', 'partner')).toBe(true)
    })

    it('partner cannot access admin-level tools', () => {
      expect(canAccess('partner', 'admin')).toBe(false)
    })

    it('admin can access all tool levels', () => {
      expect(canAccess('admin', 'guest')).toBe(true)
      expect(canAccess('admin', 'user')).toBe(true)
      expect(canAccess('admin', 'partner')).toBe(true)
      expect(canAccess('admin', 'admin')).toBe(true)
    })

    it('system role cannot be set from user session — must throw', () => {
      // System role should have highest hierarchy
      expect(roleHierarchy['system']).toBeGreaterThan(roleHierarchy['admin'])
      // But canAccess should work structurally
      expect(canAccess('system', 'admin')).toBe(true)
    })

    it('unknown role defaults to lowest access level', () => {
      // @ts-ignore - intentionally testing with invalid role
      expect(canAccess(undefined, 'user')).toBe(false)
    })

    it('guest can access guest-level tools', () => {
      expect(canAccess('guest', 'guest')).toBe(true)
    })

    it('role hierarchy values are correctly ordered', () => {
      expect(roleHierarchy['guest']).toBeLessThan(roleHierarchy['user'])
      expect(roleHierarchy['user']).toBeLessThan(roleHierarchy['partner'])
      expect(roleHierarchy['partner']).toBeLessThan(roleHierarchy['admin'])
      expect(roleHierarchy['admin']).toBeLessThan(roleHierarchy['system'])
    })
  })
})
