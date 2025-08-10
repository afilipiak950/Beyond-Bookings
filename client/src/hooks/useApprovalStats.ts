import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./useAuth";

interface ApprovalStats {
  pending: number;
  total: number;
}

export function useApprovalStats() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['/api/approvals/stats'],
    queryFn: (): Promise<ApprovalStats> => apiRequest('/api/approvals/stats'),
    enabled: user?.role === 'admin',
    refetchInterval: 15000, // Poll every 15 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}