import { useState, useEffect } from "react";
import { useTheme } from "@/components/ui/theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AppSidebar from "./app-sidebar";
import { Menu, Moon, Sun, Sparkles, Activity, Zap, Send, Bot, User, Loader2, MessageCircle } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for DocumentIQ. I can help you with document analysis, OCR processing, financial workflow optimization, and answer any questions about your document intelligence platform. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // AI Chat mutation
  const aiChatMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("/api/ai/chat", "POST", { message });
    },
    onSuccess: (response: any) => {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      }]);
    },
    onError: (error: any) => {
      toast({
        title: "AI Assistant Error",
        description: error.message || "Failed to get response from AI assistant.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now() - 1,
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    aiChatMutation.mutate(currentMessage);
    setCurrentMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
            
            {/* AI Assistant Dialog */}
            <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-sidebar="true"
                  className="interactive-hover glass-card border-0 p-2.5 relative animate-glowPulse"
                >
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl h-[600px] flex flex-col bg-white border border-blue-200/30 shadow-2xl">
                <DialogHeader className="border-b border-blue-200/20 pb-4">
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-500" />
                    AI Assistant
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200/20">
                      Online
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Your intelligent assistant for Beyond Bookings platform. Ask me anything about pricing, hotels, or system features.
                  </DialogDescription>
                </DialogHeader>

                {/* Chat Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-green-500 text-white'
                        }`}>
                          {message.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div className={`flex-1 max-w-[80%] ${
                          message.role === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          <div className={`inline-block px-4 py-3 rounded-lg shadow-sm ${
                            message.role === 'user'
                              ? 'bg-blue-500 text-white rounded-br-none'
                              : 'bg-gray-50 text-gray-900 rounded-bl-none border border-gray-200'
                          }`}>
                            <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none"
                                 dangerouslySetInnerHTML={{
                                   __html: message.content
                                     .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                     .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                     .replace(/•/g, '&bull;')
                                     .replace(/\n/g, '<br/>')
                                 }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {aiChatMutation.isPending && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="inline-block px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 rounded-bl-none">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-slate-600">AI is thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Quick Action Buttons */}
                <div className="border-t border-gray-200 pt-3 pb-2">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMessage("How do I calculate pricing with VAT?")}
                      className="text-xs h-7 px-3 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      💰 Pricing Help
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMessage("Show me my dashboard analytics")}
                      className="text-xs h-7 px-3 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      📊 Analytics
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMessage("How do I export my calculations?")}
                      className="text-xs h-7 px-3 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                    >
                      📄 Export Guide
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMessage("Help me upload documents for OCR analysis")}
                      className="text-xs h-7 px-3 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                    >
                      🔍 OCR Help
                    </Button>
                  </div>
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask me anything about your hotel pricing platform..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={aiChatMutation.isPending}
                      className="flex-1 bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!currentMessage.trim() || aiChatMutation.isPending}
                      className="px-3 bg-blue-500 hover:bg-blue-600"
                    >
                      {aiChatMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>Press Enter to send, Shift+Enter for new line</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span>AI Ready</span>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
