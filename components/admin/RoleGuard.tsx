'use client';

import { useAdminRole, type Vloga } from '@/hooks/use-admin-role';
import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  requiredRole: Vloga | Vloga[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({
  requiredRole,
  children,
  fallback,
}: RoleGuardProps) {
  const { hasPermission, isLoading } = useAdminRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPermission(requiredRole)) {
    return (
      fallback || (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Access Denied</p>
          <p className="mt-1">You don't have permission to access this content.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
