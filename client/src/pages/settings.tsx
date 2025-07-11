import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ui/theme-provider";
import { Settings as SettingsIcon, Moon, Sun, Bell, Shield, Database } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { theme, setTheme } = useTheme();

  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [calculationUpdates, setCalculationUpdates] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [defaultVatRate, setDefaultVatRate] = useState("19");
  const [defaultMargin, setDefaultMargin] = useState("25");

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

  const isAdmin = (user as any)?.role === 'admin';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage your account preferences and application settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appearance Settings */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-2xl opacity-60"></div>
            <Card className="relative glass-card border-blue-200/30 rounded-2xl shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="h-5 w-5 mr-2" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dark Mode</Label>
                  <div className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4" />
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                  <Moon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Notifications */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-50 via-white to-green-50 rounded-2xl opacity-60"></div>
            <Card className="relative glass-card border-green-200/30 rounded-2xl shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure your notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </div>
                </div>
                <Switch 
                  checked={emailNotifications}
                  onCheckedChange={(checked) => {
                    setEmailNotifications(checked);
                    toast({
                      title: "Settings Updated",
                      description: `Email notifications ${checked ? 'enabled' : 'disabled'}`,
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Push Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive browser notifications
                  </div>
                </div>
                <Switch 
                  checked={pushNotifications}
                  onCheckedChange={(checked) => {
                    setPushNotifications(checked);
                    toast({
                      title: "Settings Updated",
                      description: `Push notifications ${checked ? 'enabled' : 'disabled'}`,
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Calculation Updates</Label>
                  <div className="text-sm text-muted-foreground">
                    Notify when calculations are completed
                  </div>
                </div>
                <Switch 
                  checked={calculationUpdates}
                  onCheckedChange={(checked) => {
                    setCalculationUpdates(checked);
                    toast({
                      title: "Settings Updated",
                      description: `Calculation updates ${checked ? 'enabled' : 'disabled'}`,
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Admin Settings */}
          {isAdmin && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-white to-purple-50 rounded-2xl opacity-60"></div>
              <Card className="relative glass-card border-purple-200/30 rounded-2xl shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Admin Settings
                </CardTitle>
                <CardDescription>
                  Administrative controls and user management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default VAT Rate (%)</Label>
                  <Input
                    type="number"
                    value={defaultVatRate}
                    onChange={(e) => setDefaultVatRate(e.target.value)}
                    placeholder="19"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Operational Cost Margin (%)</Label>
                  <Input
                    type="number"
                    value={defaultMargin}
                    onChange={(e) => setDefaultMargin(e.target.value)}
                    placeholder="25"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-approve Calculations</Label>
                    <div className="text-sm text-muted-foreground">
                      Automatically approve new calculations
                    </div>
                  </div>
                  <Switch 
                    checked={autoApprove}
                    onCheckedChange={(checked) => {
                      setAutoApprove(checked);
                      toast({
                        title: "Admin Settings Updated",
                        description: `Auto-approve calculations ${checked ? 'enabled' : 'disabled'}`,
                      });
                    }}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: "Admin Settings Saved",
                      description: `VAT Rate: ${defaultVatRate}%, Margin: ${defaultMargin}%`,
                    });
                  }}
                >
                  Save Admin Settings
                </Button>
              </CardContent>
            </Card>
          </div>
          )}
        </div>

        {/* Account Actions */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 rounded-2xl opacity-60"></div>
          <Card className="relative glass-card border-emerald-200/30 rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              Manage your account and data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Export Account Data</h4>
                <p className="text-sm text-muted-foreground">
                  Download all your pricing calculations and data
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Export Started",
                    description: "Your account data export has been initiated. You'll receive a download link shortly.",
                  });
                }}
              >
                Export Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </AppLayout>
  );
}
