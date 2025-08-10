import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useLocation } from 'wouter';
import AppLayout from '@/components/layout/app-layout';

export default function AccessDenied() {
  const [, navigate] = useLocation();

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <ShieldX className="h-20 w-20 text-red-500" />
                <div className="absolute -top-1 -right-1 bg-red-100 rounded-full p-1">
                  <span className="text-red-600 text-xs font-bold">403</span>
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl text-red-600 mb-2">Access Denied</CardTitle>
            <CardDescription className="text-lg">
              Administrator rights are required to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200 leading-relaxed">
                You don't have the necessary permissions to view this content. 
                This page is restricted to system administrators only.
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                If you believe this is an error, please contact your system administrator.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => navigate('/')} 
                variant="default" 
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>
              <Button 
                onClick={() => window.history.back()} 
                variant="outline" 
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}