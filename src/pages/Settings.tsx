import { useState, useEffect } from "react";
import { AppLayoutWithMenu as AppLayout } from "@/components/layout/AppLayout";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User, Bell, Shield, Database, Globe, Save, Loader2, UserPlus, Trash2, Users, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  student_id: string | null;
  gender: "male" | "female" | null;
  role?: string;
}

const Settings = () => {
  const { profile, role } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Admin user management
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Edit user state
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editUserFullName, setEditUserFullName] = useState("");
  const [editUserRole, setEditUserRole] = useState<string>("warden");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);

  // New user form
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("male_warden");
  const [newUserStudentId, setNewUserStudentId] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserGender, setNewUserGender] = useState<"male" | "female" | "">("");

  useEffect(() => {
    if (role === "admin") {
      fetchUsers();
    }
  }, [role]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Merge profiles with roles and filter out students
      const usersWithRoles = (profiles || [])
        .map(p => {
          // Find role by user_id first, then fallback to id if they happen to match in some scenarios
          // (though usually user_id is the link to auth.users)
          const userRole = roles?.find(r => r.user_id === p.user_id)?.role;
          return {
            ...p,
            role: userRole || "unknown",
          };
        })
        .filter(u => u.role !== "student" && !u.student_id);

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      toast({
        title: "Error",
        description: "Email, password, and full name are required",
        variant: "destructive",
      });
      return;
    }

    if (newUserRole === "warden" && !newUserGender) {
      toast({
        title: "Error",
        description: "Please specify the warden gender (Male or Female)",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingUser(true);
    try {
      // Create user via edge function (doesn't log admin out)
      const { data: sessionData } = await supabase.auth.getSession();
      const roleValue = newUserRole === "admin" ? "admin" : "warden";
      const genderValue = newUserRole === "male_warden" ? "male" : newUserRole === "female_warden" ? "female" : null;

      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          full_name: newUserFullName,
          role: roleValue,
          gender: genderValue,
          phone: newUserPhone || null,
          student_id: newUserStudentId || null,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setIsAddUserDialogOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFullName("");
      setNewUserRole("male_warden");
      setNewUserStudentId("");
      setNewUserPhone("");
      setNewUserGender("");

      // Wait a moment for trigger to create profile, then refresh
      setTimeout(fetchUsers, 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const getRoleBadgeClass = (userRole: string) => {
    switch (userRole) {
      case "admin":
        return "bg-destructive/10 text-destructive";
      case "warden":
        return "bg-warning/10 text-warning";
      case "student":
        return "bg-success/10 text-success";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditUserFullName(user.full_name);

    let initialRole = user.role || "warden";
    if (user.role === "warden" && user.gender) {
      initialRole = `${user.gender}_warden`;
    }
    setEditUserRole(initialRole);

    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editUserFullName.trim()) {
      toast({
        title: "Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    if (editUserRole === "warden") {
      toast({
        title: "Error",
        description: "Please select a specific warden gender (Male or Female Warden)",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingUser(true);
    try {
      const newRole = editUserRole === "admin" ? "admin" : "warden";
      const newGender = editUserRole === "male_warden" ? "male" : editUserRole === "female_warden" ? "female" : null;

      // Update profile name and gender using the profile primary key (id)
      // This is safer than user_id which might be null for some legacy/broken entries
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editUserFullName.trim(),
          gender: newGender
        })
        .eq("id", editingUser.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (newRole !== editingUser.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", editingUser.user_id);

        if (roleError) throw roleError;
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setIsEditUserDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    const deletingProfileId = userToDelete.id;
    const deletingUserId = userToDelete.user_id;
    setIsDeletingUser(deletingProfileId);

    // Close dialog and clear state first
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);

    try {
      // Delete user role first if we have a user_id
      if (deletingUserId) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", deletingUserId);

        if (roleError) throw roleError;
      }

      // Delete user via edge function if we have a user_id (fully removes auth account)
      if (deletingUserId) {
        const response = await supabase.functions.invoke("create-user", {
          body: {
            action: "delete",
            user_id: deletingUserId,
          },
        });

        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);
      } else {
        // Fallback: Delete profile directly if no user_id (unlinked profile)
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", deletingProfileId);

        if (profileError) throw profileError;
      }

      // Remove user from state immediately
      setUsers(prevUsers => prevUsers.filter(u => u.id !== deletingProfileId));

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error: any) {
      // Refetch to restore state on error
      fetchUsers();
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsDeletingUser(null);
    }
  };

  const getDisplayRole = (user: UserWithRole) => {
    if (user.role === "warden" && user.gender) {
      return user.gender === "male" ? "Male Warden" : "Female Warden";
    }
    return user.role;
  };
  return (
    <AppLayout>
      <AppHeader
        title="Settings"
        subtitle="Manage your account and system preferences"
      />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Admin User Management */}
        {role === "admin" && (
          <Card className="opacity-0 animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Create and manage system users</CardDescription>
                  </div>
                </div>
                <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to the system.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="new-email">Email *</Label>
                        <Input
                          id="new-email"
                          type="email"
                          placeholder="user@example.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new-password">Password *</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Min 6 characters"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new-name">Full Name *</Label>
                        <Input
                          id="new-name"
                          placeholder="John Doe"
                          value={newUserFullName}
                          onChange={(e) => setNewUserFullName(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new-role">Role *</Label>
                        <Select value={newUserRole} onValueChange={setNewUserRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="male_warden">Male Warden</SelectItem>
                            <SelectItem value="female_warden">Female Warden</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new-phone">Phone</Label>
                        <Input
                          id="new-phone"
                          placeholder="+256 700 123 456"
                          value={newUserPhone}
                          onChange={(e) => setNewUserPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateUser}
                        disabled={isCreatingUser}
                      >
                        {isCreatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create User
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge className={cn("capitalize", getRoleBadgeClass(user.role || ""))}>
                              {getDisplayRole(user)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditUser(user)}
                                title="Edit user"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(user)}
                                disabled={isDeletingUser === user.id}
                                title="Delete user"
                                className="text-destructive hover:text-destructive"
                              >
                                {isDeletingUser === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Edit User Dialog */}
              <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                      Update user name and role.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingUser?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">Full Name *</Label>
                      <Input
                        id="edit-name"
                        placeholder="John Doe"
                        value={editUserFullName}
                        onChange={(e) => setEditUserFullName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-role">Role *</Label>
                      <Select value={editUserRole} onValueChange={setEditUserRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="male_warden">Male Warden</SelectItem>
                          <SelectItem value="female_warden">Female Warden</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateUser}
                      disabled={isUpdatingUser}
                    >
                      {isUpdatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete User Confirmation Dialog */}
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete <strong>{userToDelete?.full_name}</strong>? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteUser}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeletingUser ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Profile Settings */}
        <Card className="opacity-0 animate-fade-in stagger-1">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                {profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
              </div>
              <div>
                <Button variant="outline" size="sm">Change Photo</Button>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" defaultValue={profile?.full_name || ""} disabled={role === "warden"} className={role === "warden" ? "bg-muted" : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={profile?.email || ""} disabled={role === "warden"} className={role === "warden" ? "bg-muted" : ""} />
                {role === "warden" && (
                  <p className="text-xs text-muted-foreground">Contact your administrator to update your email</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" defaultValue={role || ""} disabled className="capitalize" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" defaultValue={profile?.phone || ""} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="opacity-0 animate-fade-in stagger-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure how you receive alerts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive email alerts for important updates</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Low Stock Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when items are running low</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Reminders</p>
                <p className="text-sm text-muted-foreground">Alerts for scheduled maintenance tasks</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="opacity-0 animate-fade-in stagger-3">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>System Preferences</CardTitle>
                <CardDescription>Configure system-wide settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <Globe className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sw">Swahili</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select defaultValue="dd-mm-yyyy">
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd-mm-yyyy">DD-MM-YYYY</SelectItem>
                    <SelectItem value="mm-dd-yyyy">MM-DD-YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="opacity-0 animate-fade-in stagger-4">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div></div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline">Cancel</Button>
          <Button className="btn-gradient-primary gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
