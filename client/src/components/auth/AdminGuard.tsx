import { ReactNode } from 'react';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { isAdmin, isLoading } = useRole();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Verifying permissions...</div>
      </div>
    );
  }

  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ShieldX className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Access Denied</CardTitle>
            <CardDescription>
              Administrator rights are required to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You don't have the necessary permissions to view this content.
              If you believe this is an error, please contact your system administrator.
            </p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

interface HasRoleProps {
  role: 'admin' | 'user';
  children: ReactNode;
  fallback?: ReactNode;
}

export function HasRole({ role, children, fallback = null }: HasRoleProps) {
  const { hasRole, isLoading } = useRole();

  if (isLoading) {
    return null;
  }

  if (!hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}