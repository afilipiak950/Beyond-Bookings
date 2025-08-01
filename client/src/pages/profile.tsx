import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  User as UserIcon, 
  Mail, 
  Calendar, 
  Shield, 
  LogOut, 
  Camera, 
  Upload, 
  Eye, 
  EyeOff, 
  Key,
  Save,
  Loader2,
  AlertTriangle
} from "lucide-react";

export default function Profile() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    profileImageUrl: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        profileImageUrl: user.profileImageUrl || ""
      });
      setImagePreview(user.profileImageUrl || "");
    }
  }, [user]);

  // Track changes
  useEffect(() => {
    if (user) {
      const hasProfileChanges = 
        profileData.firstName !== (user.firstName || "") ||
        profileData.lastName !== (user.lastName || "") ||
        profileData.profileImageUrl !== (user.profileImageUrl || "") ||
        profileImage !== null;
      setHasChanges(hasProfileChanges);
    }
  }, [profileData, profileImage, user]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; profileImageUrl: string }) => {
      return await apiRequest("/api/auth/profile", "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setHasChanges(false);
      setProfileImage(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("/api/auth/change-password", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error) => {
      toast({
        title: "Password Change Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle profile save
  const handleSaveProfile = () => {
    let finalImageUrl = profileData.profileImageUrl;
    
    // If there's a new image uploaded, we would typically upload it first
    // For now, we'll just use the URL field
    if (profileImage) {
      // In a real app, you'd upload the image here and get back a URL
      // For demo purposes, we'll use the preview URL
      finalImageUrl = imagePreview;
    }

    updateProfileMutation.mutate({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      profileImageUrl: finalImageUrl
    });
  };

  // Handle password change
  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

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

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Export account data mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/export/all-data", {
        method: "GET",
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      const blob = await response.blob();
      return blob;
    },
    onSuccess: (blob) => {
      // Create and download the ZIP file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `bebo-convert-complete-export-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Your account data has been exported as individual .xls files in a .zip archive.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export account data.",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/delete-account", "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      // Redirect to home page after deletion
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account.",
        variant: "destructive",
      });
    },
  });

  const handleExportData = () => {
    exportDataMutation.mutate();
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Profile</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage your account information and preferences
            </p>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Unsaved changes</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Profile Overview Sidebar */}
          <div className="lg:col-span-1 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-2xl opacity-60"></div>
            <Card className="relative glass-card border-blue-200/30 rounded-2xl shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="relative mx-auto mb-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={imagePreview || user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
                  <AvatarFallback className="text-xl">
                    {(user?.firstName?.[0] || "U")}{(user?.lastName?.[0] || "")}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <CardTitle className="text-lg">
                {user?.firstName} {user?.lastName}
              </CardTitle>
              <CardDescription>{user?.email}</CardDescription>
              <div className="flex justify-center mt-3">
                <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user?.role === 'admin' ? 'Administrator' : 'User'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="ml-auto font-medium">{user?.email}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Member since:</span>
                  <span className="ml-auto font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Role:</span>
                  <span className="ml-auto font-medium capitalize">{user?.role}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile Information</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="account">Account Actions</TabsTrigger>
              </TabsList>

              {/* Profile Information Tab */}
              <TabsContent value="profile">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-50 via-white to-green-50 rounded-2xl opacity-60"></div>
                  <Card className="relative glass-card border-green-200/30 rounded-2xl shadow-2xl">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details and profile settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ""}
                        placeholder="Enter your email"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed. Please contact support if needed.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profileImageUrl">Profile Image URL</Label>
                      <Input
                        id="profileImageUrl"
                        type="url"
                        value={profileData.profileImageUrl}
                        onChange={(e) => setProfileData(prev => ({ ...prev, profileImageUrl: e.target.value }))}
                        placeholder="https://example.com/your-image.jpg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter a URL to your profile image or upload an image using the camera button
                      </p>
                    </div>

                    {profileImage && (
                      <div className="space-y-2">
                        <Label>Image Preview</Label>
                        <div className="flex items-center gap-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={imagePreview} alt="Preview" />
                            <AvatarFallback>Preview</AvatarFallback>
                          </Avatar>
                          <div className="text-sm text-muted-foreground">
                            <p>File: {profileImage.name}</p>
                            <p>Size: {(profileImage.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setProfileImage(null);
                              setImagePreview(user?.profileImageUrl || "");
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setProfileData({
                            firstName: user?.firstName || "",
                            lastName: user?.lastName || "",
                            email: user?.email || "",
                            profileImageUrl: user?.profileImageUrl || ""
                          });
                          setProfileImage(null);
                          setImagePreview(user?.profileImageUrl || "");
                        }}
                        disabled={!hasChanges}
                      >
                        Cancel Changes
                      </Button>
                      <Button 
                        onClick={handleSaveProfile}
                        disabled={!hasChanges || updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-white to-purple-50 rounded-2xl opacity-60"></div>
                  <Card className="relative glass-card border-purple-200/30 rounded-2xl shadow-2xl">
                  <CardHeader>
                    <CardTitle>Password & Security</CardTitle>
                    <CardDescription>
                      Update your password and security settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Enter your current password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          >
                            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Enter your new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          >
                            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Password must be at least 6 characters long
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm your new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          >
                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                        }}
                        disabled={!passwordData.currentPassword && !passwordData.newPassword && !passwordData.confirmPassword}
                      >
                        Clear Form
                      </Button>
                      <Button 
                        onClick={handleChangePassword}
                        disabled={
                          !passwordData.currentPassword || 
                          !passwordData.newPassword || 
                          !passwordData.confirmPassword ||
                          changePasswordMutation.isPending
                        }
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Change Password
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              </TabsContent>

              {/* Account Actions Tab */}
              <TabsContent value="account">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 rounded-2xl opacity-60"></div>
                  <Card className="relative glass-card border-emerald-200/30 rounded-2xl shadow-2xl">
                  <CardHeader>
                    <CardTitle>Account Management</CardTitle>
                    <CardDescription>
                      Manage your account and session settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-4 border border-slate-200 dark:border-slate-700 rounded-lg px-4">
                        <div>
                          <h4 className="font-medium flex items-center">
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Sign out of your account on this device
                          </p>
                        </div>
                        <Button variant="outline" onClick={handleLogout}>
                          Sign Out
                        </Button>
                      </div>

                      <div className="flex items-center justify-between py-4 border border-slate-200 dark:border-slate-700 rounded-lg px-4">
                        <div>
                          <h4 className="font-medium flex items-center">
                            <Upload className="h-4 w-4 mr-2" />
                            Export Account Data
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Download all your account data and settings
                          </p>
                        </div>
                        <Button 
                          variant="outline"
                          onClick={handleExportData}
                          disabled={exportDataMutation.isPending}
                        >
                          {exportDataMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2" />
                              Exporting...
                            </>
                          ) : (
                            "Export Data"
                          )}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between py-4 border border-red-200 dark:border-red-800 rounded-lg px-4 bg-red-50 dark:bg-red-950">
                        <div>
                          <h4 className="font-medium text-red-700 dark:text-red-300 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Delete Account
                          </h4>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Permanently delete your account and all associated data
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive"
                              disabled={deleteAccountMutation.isPending}
                            >
                              {deleteAccountMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2" />
                                  Deleting...
                                </>
                              ) : (
                                "Delete Account"
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your
                                account and remove all of your data from our servers, including:
                                <br /><br />
                                • All your pricing calculations and reports
                                <br />
                                • Hotel data and preferences
                                <br />
                                • Profile information and settings
                                <br />
                                • OCR analysis results and files
                                <br /><br />
                                Type "DELETE" in the confirmation box to proceed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteAccount}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Yes, Delete My Account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
