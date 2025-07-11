import { useState, useEffect } from "react";
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
  Brain,
  LogOut,
  Menu,
  Home,
  Building2,
  Sparkles,
  TrendingUp,
  Database,
  Zap
} from "lucide-react";
import beyondBookingsLogo from "@assets/bc Logo NEU Slogan_1752244229726.png";

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
    badge: "NEW",
  },
  {
    name: "Customer Request",
    href: "/customer-request",
    icon: Building2,
    description: "Hotel financing request form",
    gradient: "from-emerald-500 to-teal-500",
    badge: "LIVE",
  },
  {
    name: "Analysis Results",
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
    badge: "AI",
  },
  {
    name: "Data Management",
    href: "/customer-management",
    icon: Database,
    description: "Smart document management",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    name: "User Management",
    href: "/user-management",
    icon: Users,
    description: "Manage platform users",
    gradient: "from-red-500 to-pink-500",
    adminOnly: true,
  },
  {
    name: "Intelligence Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Advanced analytics & exports",
    gradient: "from-orange-500 to-red-500",
  },
  {
    name: "AI Settings",
    href: "/settings",
    icon: Settings,
    description: "Document processing optimization",
    gradient: "from-slate-500 to-gray-500",
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
      
      {/* Ultra-Modern Header */}
      <div className="flex items-center justify-between h-16 px-4 glass-nav animate-slideInUp relative z-10">
        {!isCollapsed && (
          <div className="flex items-center space-x-3 animate-scaleIn">
            <img 
              src={beyondBookingsLogo} 
              alt="Beyond Bookings Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
        )}
      </div>

      {/* Ultra-Modern Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 relative z-10">
        {navigation.map((item, index) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          // Filter admin-only items for non-admin users
          if (item.adminOnly && (!user || user.role !== 'admin')) {
            return null;
          }
          
          return (
            <div
              key={item.name}
              className={cn(
                "group relative animate-slideInRight",
                `animation-delay-${(index + 1) * 100}`
              )}
              style={{
                animationDelay: `${index * 0.1}s`
              }}
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
                      {(item as any).badge && (
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-1 py-0.5 flex-shrink-0 text-xs scale-75 origin-left">
                          {(item as any).badge}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-full">
                      {item.description}
                    </span>
                  </div>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute right-2 w-2 h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full animate-pulse" />
                )}

                {/* Hover Shimmer Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                </div>
              </Button>
            </div>
          );
        })}
      </nav>

      {/* Ultra-Modern User Section */}
      <div className="p-4 glass-nav relative z-10 animate-slideInUp">
        {!isCollapsed && (
          <>
            <div className="flex items-center space-x-3 p-3 mb-3 glass-card rounded-xl animate-scaleIn">
              <Avatar className="w-10 h-10 ring-2 ring-blue-500/30 animate-breathe">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-green-500 text-white font-semibold">
                  BB
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  Beyond Bookings User
                </p>
                <div className="flex items-center space-x-1.5">
                  <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-1 py-0.5">
                    Premium
                  </Badge>
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
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
