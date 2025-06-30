import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hotel, Key, Mail, Lock, Star, Building2, MapPin, Wifi, Coffee, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [floatingIcons, setFloatingIcons] = useState<Array<{id: number, icon: any, x: number, y: number, delay: number}>>([]);

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  useEffect(() => {
    // Create floating hotel-themed icons
    const icons = [Hotel, Building2, MapPin, Star, Wifi, Coffee, Car, Key];
    const newFloatingIcons = icons.map((icon, index) => ({
      id: index,
      icon,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5
    }));
    setFloatingIcons(newFloatingIcons);
  }, []);



  const loginMutation = useMutation({
    mutationFn: async (data: typeof loginData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Logged in successfully"
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    }
  });



  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };



  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-green-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating hotel icons */}
        {floatingIcons.map(({ id, icon: Icon, x, y, delay }) => (
          <div
            key={id}
            className="absolute opacity-10 dark:opacity-5"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animation: `float 6s ease-in-out infinite`,
              animationDelay: `${delay}s`
            }}
          >
            <Icon className="h-12 w-12 text-primary/30" />
          </div>
        ))}
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 -right-20 w-72 h-72 bg-secondary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo section with animation */}
          <div className="text-center mb-8 animate-fadeInUp">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300">
              <Hotel className="h-10 w-10 text-white animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Beyond Bookings
            </h1>
            <p className="text-slate-600 dark:text-gray-300 text-lg font-medium">
              Premium Hotel Intelligence Platform
            </p>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-yellow-400 fill-current animate-twinkle" style={{animationDelay: `${i * 0.2}s`}} />
              ))}
            </div>
          </div>

          {/* Login card with glassmorphism effect */}
          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-0 shadow-2xl transform hover:scale-[1.02] transition-all duration-300 animate-slideInUp">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white flex items-center justify-center gap-2">
                <Key className="h-6 w-6 text-primary animate-bounce" />
                Welcome Back
              </CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-300">
                Access your hotel pricing dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email field with icon */}
                <div className="space-y-2 group">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary group-focus-within:animate-pulse" />
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your professional email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      className="pl-10 h-12 bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-200 text-base"
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                {/* Password field with icon */}
                <div className="space-y-2 group">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary group-focus-within:animate-pulse" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your secure password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      className="pl-10 h-12 bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-200 text-base"
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                {/* Submit button with loading animation */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing you in...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Access Dashboard
                    </div>
                  )}
                </Button>
              </form>

              {/* Trust indicators */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Secure Login
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    Enterprise Grade
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    24/7 Support
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400 animate-fadeIn">
            <p>© 2025 Beyond Bookings. Professional Hotel Management Solutions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}