import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import PricingCalculator from "@/components/pricing/pricing-calculator";
import RecentCalculations from "@/components/pricing/recent-calculations";

export default function PricingAgent() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pricing Agent</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            AI-powered hotel pricing calculator with real-time market insights
          </p>
        </div>

        {/* Pricing Calculator */}
        <PricingCalculator />

        {/* Recent Calculations */}
        <RecentCalculations />
      </div>
    </AppLayout>
  );
}
