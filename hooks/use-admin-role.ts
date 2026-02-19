'use client';

import { useCallback, useEffect, useState } from 'react';

export type Vloga = 'SUPER_ADMIN' | 'MODERATOR' | 'OPERATER';

interface AdminUser {
  id: string;
  email: string;
  ime: string;
  priimek: string;
  vloga: Vloga;
  aktiven: boolean;
}

interface UseAdminRoleReturn {
  admin: AdminUser | null;
  vloga: Vloga | null;
  isLoading: boolean;
  error: Error | null;
  isSuperAdmin: boolean;
  isModerator: boolean;
  isOperater: boolean;
  hasPermission: (requiredRole: Vloga | Vloga[]) => boolean;
  canManageUsers: boolean;
  canModerateContent: boolean;
  canViewOnly: boolean;
}

export function useAdminRole(): UseAdminRoleReturn {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAdminRole = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/me');
        
        if (!response.ok) {
          if (response.status === 401) {
            setAdmin(null);
          } else {
            throw new Error(`Failed to fetch admin role: ${response.statusText}`);
          }
        } else {
          const data = await response.json();
          setAdmin(data.admin);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminRole();
  }, []);

  const vloga = admin?.vloga ?? null;

  const hasPermission = useCallback(
    (requiredRole: Vloga | Vloga[]): boolean => {
      if (!vloga) return false;

      const requiredRoles = Array.isArray(requiredRole)
        ? requiredRole
        : [requiredRole];

      const roleHierarchy: Record<Vloga, number> = {
        SUPER_ADMIN: 3,
        MODERATOR: 2,
        OPERATER: 1,
      };

      const userLevel = roleHierarchy[vloga];
      const minRequiredLevel = Math.min(
        ...requiredRoles.map((r) => roleHierarchy[r])
      );

      return userLevel >= minRequiredLevel;
    },
    [vloga]
  );

  const isSuperAdmin = vloga === 'SUPER_ADMIN';
  const isModerator = vloga === 'MODERATOR';
  const isOperater = vloga === 'OPERATER';

  const canManageUsers = hasPermission('SUPER_ADMIN');
  const canModerateContent = hasPermission(['SUPER_ADMIN', 'MODERATOR']);
  const canViewOnly = hasPermission('OPERATER');

  return {
    admin,
    vloga,
    isLoading,
    error,
    isSuperAdmin,
    isModerator,
    isOperater,
    hasPermission,
    canManageUsers,
    canModerateContent,
    canViewOnly,
  };
}
