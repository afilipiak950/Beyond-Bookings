import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Search, UserPlus, Edit, Trash2, Shield, User as UserIcon, Crown, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import AppLayout from "@/components/layout/app-layout";

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateUserForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
}

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user"
  });
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all users (admin only)
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: (): Promise<{ success: boolean; users: User[]; count: number }> => 
      apiRequest('/api/admin/users'),
    enabled: currentUser?.role === 'admin'
  });

  const users = usersResponse?.users || [];

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserForm) =>
      apiRequest('/api/admin/users', {
        method: 'POST',
        body: userData
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setCreateDialogOpen(false);
      setCreateForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "user"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      apiRequest(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: { role }
      }),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "User role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  if (currentUser?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <p className="text-red-600">Access denied. Admin privileges required.</p>
        </div>
      </AppLayout>
    );
  }

  const usersData = users?.users || [];
  const adminCount = usersData.filter((user: User) => user.role === 'admin').length;

  const filteredUsers = usersData.filter((user: User) => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (user: User, newRole: string) => {
    // Check if this is the last admin
    if (user.role === 'admin' && newRole === 'user' && adminCount === 1) {
      toast({
        title: "Error",
        description: "Cannot change the last admin to user. At least one admin must remain.",
        variant: "destructive",
      });
      return;
    }

    updateUserRoleMutation.mutate({ userId: user.id, role: newRole });
  };

  const handleDeleteUser = (user: User) => {
    // Check if this is the last admin
    if (user.role === 'admin' && adminCount === 1) {
      toast({
        title: "Error",
        description: "Cannot delete the last admin. At least one admin must remain.",
        variant: "destructive",
      });
      return;
    }

    deleteUserMutation.mutate(user.id);
  };

  const handleCreateUser = () => {
    createUserMutation.mutate(createForm);
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? <Crown className="h-4 w-4 text-yellow-500" /> : <UserIcon className="h-4 w-4 text-blue-500" />;
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <Badge className="bg-yellow-500 text-white">Admin</Badge>
    ) : (
      <Badge variant="outline">User</Badge>
    );
  };

  const formatDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center">Loading users...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-100 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                  <p className="text-gray-600">Manage user accounts and roles</p>
                </div>
              </div>

              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Add a new user to the system with their role and basic information.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={createForm.firstName}
                          onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={createForm.lastName}
                          onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="Enter email address"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        placeholder="Enter password (min 6 characters)"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={createForm.role} onValueChange={(value: 'user' | 'admin') => setCreateForm({ ...createForm, role: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button 
                        onClick={handleCreateUser}
                        disabled={createUserMutation.isPending || !createForm.email || !createForm.password}
                        className="flex-1"
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setCreateDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Total Users</p>
                      <p className="text-2xl font-bold">{usersData.length}</p>
                    </div>
                    <UserIcon className="h-8 w-8 opacity-90" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Admins</p>
                      <p className="text-2xl font-bold">{adminCount}</p>
                    </div>
                    <Crown className="h-8 w-8 opacity-90" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Active Users</p>
                      <p className="text-2xl font-bold">{usersData.filter((u: User) => u.isActive).length}</p>
                    </div>
                    <UserIcon className="h-8 w-8 opacity-90" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-white/80 backdrop-blur-sm border border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <div className="grid gap-4">
            {filteredUsers.map((user: User) => (
              <Card key={user.id} className="bg-white/80 backdrop-blur-sm border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-gray-900">{formatDisplayName(user)}</h3>
                          {getRoleBadge(user.role)}
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          Created: {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role Change Buttons */}
                      {user.role === 'user' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleChange(user, 'admin')}
                          disabled={updateUserRoleMutation.isPending}
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          <Crown className="h-4 w-4 mr-1" />
                          Make Admin
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleChange(user, 'user')}
                          disabled={updateUserRoleMutation.isPending || (user.role === 'admin' && adminCount === 1)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <UserIcon className="h-4 w-4 mr-1" />
                          Make User
                        </Button>
                      )}

                      {/* Delete Button */}
                      {user.id !== currentUser?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              disabled={user.role === 'admin' && adminCount === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete user "{formatDisplayName(user)}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredUsers.length === 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border border-blue-100">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600">No users found matching your criteria.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}