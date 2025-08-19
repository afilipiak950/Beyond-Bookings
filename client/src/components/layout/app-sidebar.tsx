import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useApprovalStats } from "@/hooks/useApprovalStats";
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
  Brain,
  LogOut,
  Menu,
  Home,
  Building2,
  Sparkles,
  TrendingUp,
  Database,
  Shield,
  Zap
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: TrendingUp,
    description: "Real-time insights & analytics",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Document Workflow",
    href: "/workflow",
    icon: Sparkles,
    description: "3-step analysis process",
    gradient: "from-green-500 to-blue-500",
  },
  {
    name: "Customer Request",
    href: "/customer-request",
    icon: Building2,
    description: "Hotel financing request form",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    name: "Calculations",
    href: "/calculations",
    icon: Calculator,
    description: "View all document analyses",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    name: "Document Intelligence",
    href: "/document-analysis",
    icon: Brain,
    description: "Advanced ZIP & document processing",
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    name: "Data Management",
    href: "/customer-management",
    icon: Database,
    description: "Smart document management",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    name: "Approval Requests",
    href: "/approvals",
    icon: Users,
    description: "Review and approve calculations",
    gradient: "from-purple-500 to-pink-500",
    adminOnly: true,
    badge: true, // Enable badge for pending requests
  },
  {
    name: "User Management",
    href: "/user-management",
    icon: Shield,
    description: "Manage user accounts and roles",
    gradient: "from-yellow-500 to-orange-500",
    adminOnly: true,
  },
  {
    name: "Intelligence Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Advanced analytics & exports",
    gradient: "from-orange-500 to-red-500",
    adminOnly: true,
  },
  {
    name: "Settings & Users",
    href: "/settings",
    icon: Settings,
    description: "System settings & user management",
    gradient: "from-slate-500 to-gray-500",
  },
];

export default function AppSidebar({ className }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: approvalStats } = useApprovalStats();
  
  // Filter navigation based on role
  const visibleNavigation = navigation.filter(item => 
    !item.adminOnly || isAdmin
  );

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full glass-card border-0 transition-all duration-500 relative overflow-hidden",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
      style={{
        background: 'var(--sidebar-background)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--sidebar-border)'
      }}
    >
      {/* Ambient Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5 pointer-events-none" />
      
      {/* Ultra-Modern Header - Enlarged for Logo */}
      <div className="flex items-center justify-between h-20 px-4 glass-nav relative z-10">
        {!isCollapsed && (
          <div className="flex items-center justify-center w-full">
            <div className="flex items-center justify-center">
              <img 
                src="/bebo-convert-logo.png" 
                alt="bebo convert" 
                className="h-16 w-auto object-contain max-w-full"
                onError={(e) => {
                  console.error('Logo failed to load:', e);
                  // Fallback to text logo if image fails
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">BC</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ultra-Modern Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 relative z-10">
        {visibleNavigation.map((item, index) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <div
              key={item.name}
              className="group relative"
            >
              <Button
                variant="ghost"
                data-sidebar="true"
                className={cn(
                  "w-full justify-start h-auto p-3 transition-all duration-300 relative overflow-hidden",
                  isActive 
                    ? "glass-card bg-gradient-to-r from-blue-500/20 to-green-500/20 text-foreground border border-blue-500/30 shadow-lg" 
                    : "text-sidebar-foreground hover:glass-card hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-green-500/10 hover:border hover:border-blue-500/20",
                  isCollapsed && "px-3",
                  "interactive-hover"
                )}
                onClick={() => setLocation(item.href)}
              >
                {/* Badge for collapsed sidebar */}
                {isCollapsed && item.href === "/approvals" && approvalStats && approvalStats.pending > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold animate-pulse z-10">
                    {approvalStats.pending > 9 ? '9+' : approvalStats.pending}
                  </div>
                )}
                {/* Icon with gradient background for active state */}
                <div className={cn(
                  "flex items-center justify-center rounded-lg transition-all duration-300",
                  isActive 
                    ? `w-8 h-8 bg-gradient-to-r ${item.gradient} shadow-lg` 
                    : "w-6 h-6",
                  !isCollapsed && "mr-3"
                )}>
                  <Icon className={cn(
                    "transition-all duration-300",
                    isActive ? "h-4 w-4 text-white" : "h-4 w-4"
                  )} />
                </div>
                
                {/* Navigation Text */}
                {!isCollapsed && (
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 w-full">
                      <span className={cn(
                        "font-semibold text-xs transition-all duration-300 truncate",
                        isActive && "gradient-text"
                      )}>
                        {item.name}
                      </span>

                      {/* Approval Requests Pending Badge */}
                      {item.href === "/approvals" && approvalStats && approvalStats.pending > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto px-1.5 py-0.5 text-xs font-semibold animate-pulse flex-shrink-0"
                        >
                          {approvalStats.pending}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-full">
                      {item.description}
                    </span>
                  </div>
                )}




              </Button>
            </div>
          );
        })}
      </nav>

      {/* Ultra-Modern User Section */}
      <div className="p-4 glass-nav relative z-10">
        {!isCollapsed && (
          <>
            <div className="flex items-center space-x-3 p-3 mb-3 glass-card rounded-xl">
              <Avatar className="w-10 h-10 ring-2 ring-blue-500/30 animate-breathe">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-green-500 text-white font-semibold">
                  BC
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  bebo convert User
                </p>
                <div className="flex items-center space-x-1.5">
                  <Badge className="text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 px-1 py-0.5">
                    AI Powered
                  </Badge>
                </div>
              </div>
            </div>
            <Separator className="my-3 bg-gradient-to-r from-transparent via-border to-transparent" />
          </>
        )}
        
        <div className="space-y-2">
          <Button
            variant="ghost"
            data-sidebar="true"
            className={cn(
              "w-full justify-start interactive-hover glass-card border-0 transition-all duration-300",
              isCollapsed && "px-3"
            )}
            onClick={() => setLocation("/profile")}
          >
            <div className="w-6 h-6 bg-gradient-to-r from-slate-500 to-gray-500 rounded-lg flex items-center justify-center mr-3">
              <User className="h-3 w-3 text-white" />
            </div>
            {!isCollapsed && (
              <span className="font-medium text-xs">User Profile</span>
            )}
          </Button>
          
          <Button
            variant="ghost"
            data-sidebar="true"
            className={cn(
              "w-full justify-start interactive-hover glass-card border-0 transition-all duration-300 hover:bg-red-500/10 hover:border-red-500/20",
              isCollapsed && "px-3"
            )}
            onClick={handleLogout}
          >
            <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
              <LogOut className="h-3 w-3 text-white" />
            </div>
            {!isCollapsed && (
              <span className="font-medium text-xs text-red-600 dark:text-red-400">Sign Out</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
