import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/components/ui/theme-provider";
import { Settings as SettingsIcon, Moon, Sun, Bell, Shield, Database, Users } from "lucide-react";
import UserManagementTab from "@/components/UserManagementTab";

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

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="flex items-center space-x-2">
              <SettingsIcon className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>User Management</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appearance Settings */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-bebo-blue/5 via-white to-bebo-blue/5 rounded-2xl opacity-60"></div>
                <Card className="relative glass-card border-bebo-blue/30 rounded-2xl shadow-2xl">
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

              {/* Default Settings */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-bebo-green/5 via-white to-bebo-green/5 rounded-2xl opacity-60"></div>
                <Card className="relative glass-card border-bebo-green/30 rounded-2xl shadow-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      Default Values
                    </CardTitle>
                    <CardDescription>
                      Set default values for new calculations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="defaultVat">Default VAT Rate (%)</Label>
                        <Input
                          id="defaultVat"
                          value={defaultVatRate}
                          onChange={(e) => setDefaultVatRate(e.target.value)}
                          placeholder="19"
                        />
                      </div>
                      <div>
                        <Label htmlFor="defaultMargin">Default Margin (%)</Label>
                        <Input
                          id="defaultMargin"
                          value={defaultMargin}
                          onChange={(e) => setDefaultMargin(e.target.value)}
                          placeholder="25"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email Notifications */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-bebo-green/5 via-white to-bebo-green/5 rounded-2xl opacity-60"></div>
                <Card className="relative glass-card border-bebo-green/30 rounded-2xl shadow-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="h-5 w-5 mr-2" />
                      Email Notifications
                    </CardTitle>
                    <CardDescription>
                      Configure your email notification preferences
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
                        <Label className="text-base">Calculation Updates</Label>
                        <div className="text-sm text-muted-foreground">
                          Get notified when calculations complete
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

              {/* System Notifications */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-bebo-secondary/5 via-white to-bebo-secondary/5 rounded-2xl opacity-60"></div>
                <Card className="relative glass-card border-bebo-secondary/30 rounded-2xl shadow-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      System Settings
                    </CardTitle>
                    <CardDescription>
                      Configure system behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                        <Label className="text-base">Auto-approve Calculations</Label>
                        <div className="text-sm text-muted-foreground">
                          Automatically approve completed calculations
                        </div>
                      </div>
                      <Switch 
                        checked={autoApprove}
                        onCheckedChange={(checked) => {
                          setAutoApprove(checked);
                          toast({
                            title: "Settings Updated",
                            description: `Auto-approve ${checked ? 'enabled' : 'disabled'}`,
                          });
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagementTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}