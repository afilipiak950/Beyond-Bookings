import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AppSidebar from "./app-sidebar";
import { Menu, Moon, Sun, Sparkles, Activity, Zap } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-muted/20 mesh-bg relative overflow-hidden">
      {/* Ultra-Modern Ambient Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-green-400/20 rounded-full blur-3xl animate-morphGradient" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-morphGradient animation-delay-2000" />
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-gradient-radial from-blue-400/5 via-green-400/5 to-transparent rounded-full animate-breathe" />
        
        {/* Floating Particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-green-400 rounded-full animate-float`}
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
              animationDelay: `${i * 0.8}s`
            }}
          />
        ))}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0 relative z-10 animate-slideInLeft">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 glass-card border-0">
          <AppSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Ultra-Modern Header */}
        <header className="glass-nav h-16 flex items-center justify-between px-6 animate-slideInUp backdrop-blur-lg border-0 shadow-lg">
          <div className="flex items-center space-x-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-sidebar="true"
                  className="lg:hidden mr-2 interactive-hover glass-card border-0"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            {/* Modern Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center animate-breathe">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-bold gradient-text animate-scaleIn">
                Beyond Bookings
              </h2>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* AI Status Indicator */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full glass-card animate-slideInRight">
              <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              <span className="text-sm font-medium text-foreground">Live AI</span>
            </div>

            {/* Modern Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              data-sidebar="true"
              onClick={toggleTheme}
              className="interactive-hover glass-card border-0 p-2.5"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-500 animate-twinkle" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </Button>
            
            {/* AI Assistant Indicator */}
            <Button
              variant="ghost"
              size="sm"
              data-sidebar="true"
              className="interactive-hover glass-card border-0 p-2.5 relative animate-glowPulse"
            >
              <Sparkles className="h-4 w-4 text-blue-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse" />
            </Button>
          </div>
        </header>

        {/* Ultra-Modern Main Content Area */}
        <main className="flex-1 overflow-auto relative">
          <div className="w-full h-full animate-fadeInUp">
            <div className="w-full h-full neo-card rounded-none relative overflow-hidden animate-scaleIn">
              {/* Content Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-green-500/5 pointer-events-none" />
              
              <div className="p-6 w-full h-full bg-white">
                {children}
              </div>
            </div>
          </div>

          {/* Floating Status Indicators */}
          <div className="fixed bottom-6 right-6 flex flex-col space-y-3 animate-slideInRight">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-glowPulse shadow-lg" />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-twinkle animation-delay-1000" />
            <div className="w-2 h-2 bg-green-300 rounded-full animate-twinkle animation-delay-2000" />
          </div>
        </main>
      </div>
    </div>
  );
}
