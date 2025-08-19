import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";

import Calculations from "@/pages/calculations";
import OCRAnalyzer from "@/pages/ocr-analyzer";
import CustomerManagement from "@/pages/customer-management";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import Workflow from "@/pages/workflow";
import DocumentAnalysis from "@/pages/document-analysis";
import CustomerRequest from "@/pages/customer-request";
import { Approvals } from "@/pages/approvals";
import UserManagement from "@/pages/user-management";
import AccessDenied from "@/pages/403";
import AIHub from "@/pages/ai-hub";
import DebugTest from "@/pages/debug-test";


function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/workflow" component={Workflow} />
          <Route path="/calculations" component={Calculations} />
          <Route path="/ocr-analyzer" component={OCRAnalyzer} />
          <Route path="/document-analysis" component={DocumentAnalysis} />
          <Route path="/customer-request" component={CustomerRequest} />
          <Route path="/customer-management" component={CustomerManagement} />
          <Route path="/approvals" component={Approvals} />
          <Route path="/user-management" component={UserManagement} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route path="/profile" component={Profile} />
          <Route path="/ai-hub" component={AIHub} />
          <Route path="/debug-test" component={DebugTest} />
          <Route path="/403" component={AccessDenied} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="ki-pricing-theme">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
