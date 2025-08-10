import { useAuth } from "./useAuth";

export function useRole() {
  const { user, isLoading } = useAuth();
  
  const role = user?.role || 'user';
  const isAdmin = role === 'admin';
  const isUser = role === 'user';
  
  return {
    user,
    role,
    isAdmin,
    isUser,
    isLoading,
    hasRole: (requiredRole: string) => role === requiredRole || (requiredRole === 'user' && isAdmin)
  };
}

export function useRequireAdmin() {
  const { isAdmin, isLoading } = useRole();
  
  return {
    isAdmin,
    isLoading,
    canAccess: isAdmin
  };
}