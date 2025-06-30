import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  BarChart3,
  Users,
  FileText,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Home,
  Building2,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    description: "Overview and analytics",
  },
  {
    name: "Pricing Agent",
    href: "/pricing-agent",
    icon: Calculator,
    description: "AI-powered pricing calculator",
  },
  {
    name: "Customer Management",
    href: "/customer-management",
    icon: Users,
    description: "Manage hotel clients",
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    description: "Export and analytics",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Application settings",
  },
];

export default function AppSidebar({ className }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Calculator className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">Beyond Bookings</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          data-sidebar="true"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Button
              key={item.name}
              variant={isActive ? "default" : "ghost"}
              data-sidebar="true"
              className={cn(
                "w-full justify-start h-auto p-3",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isCollapsed && "px-3"
              )}
              onClick={() => setLocation(item.href)}
            >
              <Icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
              {!isCollapsed && (
                <div className="flex flex-col items-start">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs opacity-70">{item.description}</span>
                </div>
              )}
            </Button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        {!isCollapsed && (
          <>
            <div className="flex items-center space-x-3 p-2 mb-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
                <AvatarFallback className="text-xs">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="flex items-center space-x-1">
                  <Badge
                    variant={user?.role === 'admin' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {user?.role === 'admin' ? 'Admin' : 'User'}
                  </Badge>
                </div>
              </div>
            </div>
            <Separator className="my-2" />
          </>
        )}
        
        <div className="space-y-1">
          <Button
            variant="ghost"
            data-sidebar="true"
            className={cn(
              "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCollapsed && "px-3"
            )}
            onClick={() => setLocation("/profile")}
          >
            <User className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
            {!isCollapsed && "Profile"}
          </Button>
          
          <Button
            variant="ghost"
            data-sidebar="true"
            className={cn(
              "w-full justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
              isCollapsed && "px-3"
            )}
            onClick={handleLogout}
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
            {!isCollapsed && "Logout"}
          </Button>
        </div>
      </div>
    </div>
  );
}
