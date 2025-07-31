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
import { Menu, Moon, Sun, Sparkles, Activity, Zap, Send, Bot, User, Loader2, MessageCircle, Cpu } from "lucide-react";

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
      content: 'Hello! I\'m your **AI Assistant for bebo convert**. I have access to all your hotel data, pricing calculations, and platform analytics. I can help you with:\n\n• **Hotel Management** - Analysis of your hotel portfolio\n• **Pricing Optimization** - VAT calculations and profit margin analysis\n• **Document Intelligence** - OCR processing and financial insights\n• **Business Intelligence** - Market trends and competitive analysis\n\nWhat would you like to know about your business today?',
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
      const response = await apiRequest("/api/ai/chat", "POST", { message });
      return await response.json();
    },
    onSuccess: (response: any) => {
      console.log('AI Response received:', response);
      
      // Format message with context if available
      let messageContent = response?.message;
      
      // If no message, use fallback
      if (!messageContent || messageContent.trim() === '') {
        messageContent = 'I apologize, but I encountered an issue processing your request. Please try again.';
      }
      
      // Add context indicators if available
      if (response?.context) {
        messageContent += `\n\n---\n**Analysis Context:**\n📊 ${response.context.calculationsReviewed || 0} calculations reviewed • 🏨 ${response.context.hotelsAnalyzed || 0} hotels analyzed • 📄 ${response.context.documentsProcessed || 0} documents processed`;
      }
      
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: messageContent,
        timestamp: new Date()
      }]);
    },
    onError: (error) => {
      console.error('AI Chat error:', error);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }]);
    }
  });

  const sendMessage = () => {
    if (!currentMessage.trim() || aiChatMutation.isPending) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    aiChatMutation.mutate(currentMessage);
    setCurrentMessage('');
    
    // Auto-scroll to bottom
    setTimeout(() => {
      const messagesContainer = document.getElementById('ai-chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900 relative overflow-hidden">
      {/* Ultra-Modern Background Layers */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Primary gradient mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.06),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.04),transparent_50%)]" />
        
        {/* Floating geometric shapes */}
        <div className="absolute top-0 left-0 w-full h-full opacity-40">
          <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-purple-400/10 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-60 right-32 w-96 h-96 bg-gradient-to-br from-violet-400/15 via-blue-400/10 to-cyan-400/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-40 left-60 w-80 h-80 bg-gradient-to-br from-emerald-400/15 via-teal-400/10 to-blue-400/15 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      {/* Futuristic Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/50 dark:bg-gray-950/70 dark:border-gray-800/50 dark:supports-[backdrop-filter]:bg-gray-950/50">
        <div className="container flex h-20 items-center justify-between px-8">
          <div className="flex items-center space-x-6">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden rounded-2xl h-12 w-12 bg-white/80 hover:bg-white border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80 bg-white/95 backdrop-blur-2xl border-0">
                <AppSidebar />
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Sparkles className="h-6 w-6 text-white animate-pulse" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl blur opacity-30 animate-pulse" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-black bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                  bebo convert
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium tracking-wide">
                  Die exklusive Währung für Hotels
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Enhanced Live Status */}
            <div className="hidden sm:flex items-center space-x-3 px-5 py-2.5 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/50 shadow-lg backdrop-blur-sm">
              <div className="relative">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-40" />
              </div>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tracking-wide">LIVE</span>
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-bounce" />
            </div>

            {/* Ultra-Modern AI Assistant */}
            <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="relative overflow-hidden bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-blue-300/50 hover:border-blue-400/70 transition-all duration-500 rounded-2xl px-6 py-3 h-12 shadow-lg hover:shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center space-x-3">
                    <div className="relative">
                      <Bot className="h-5 w-5 text-blue-600" />
                      <div className="absolute -inset-1 bg-blue-500/30 rounded-full blur animate-pulse" />
                    </div>
                    <span className="hidden sm:inline font-semibold text-blue-700 tracking-wide">AI Assistant</span>
                    <MessageCircle className="h-4 w-4 text-blue-500 animate-bounce" />
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl max-h-[85vh] bg-white/95 backdrop-blur-2xl border-0 shadow-2xl rounded-3xl">
                <DialogHeader className="border-b border-gray-100/50 pb-6 rounded-t-3xl bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                  <DialogTitle className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl blur opacity-30 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">AI Assistant for bebo convert</span>
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-base text-gray-600 mt-2 font-medium">
                    Intelligent insights and analysis for your hotel business data
                  </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="h-96 pr-4" id="ai-chat-messages">
                  <div className="space-y-6 py-2">
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-3xl p-5 shadow-lg ${
                          message.role === 'user' 
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white ml-auto shadow-blue-200' 
                            : 'bg-white border border-gray-100 text-gray-900 shadow-gray-100'
                        }`}>
                          <div className="flex items-start space-x-3">
                            {message.role === 'assistant' && (
                              <div className="relative mt-1">
                                <Bot className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                <div className="absolute -inset-1 bg-blue-500/20 rounded-full blur animate-pulse" />
                              </div>
                            )}
                            {message.role === 'user' && (
                              <User className="h-5 w-5 text-white mt-1 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <div 
                                className="text-sm leading-relaxed font-medium"
                                dangerouslySetInnerHTML={{
                                  __html: message.content
                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                    .replace(/\n/g, '<br>')
                                }}
                              />
                              <div className={`text-xs mt-3 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {aiChatMutation.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-3xl p-5 max-w-[85%] shadow-lg border border-gray-100">
                          <div className="flex items-center space-x-3">
                            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                            <span className="text-sm text-gray-700 font-medium">AI is analyzing your data...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                <div className="border-t border-gray-100/50 pt-6 bg-gradient-to-r from-gray-50/50 to-blue-50/30 rounded-b-3xl">
                  <div className="flex space-x-3">
                    <Input
                      placeholder="Ask me anything about your hotels, calculations, or business analytics..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && currentMessage.trim() && !aiChatMutation.isPending) {
                          sendMessage();
                        }
                      }}
                      className="flex-1 h-12 rounded-2xl border-gray-200/50 bg-white/80 backdrop-blur-sm text-base font-medium"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!currentMessage.trim() || aiChatMutation.isPending}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Enhanced Quick Actions */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 transition-all duration-300 rounded-2xl px-4 py-2 text-sm font-semibold border-yellow-200/50 shadow-sm"
                      onClick={() => setCurrentMessage("Show me my pricing analytics")}
                    >
                      💰 Pricing Analytics
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-300 rounded-2xl px-4 py-2 text-sm font-semibold border-green-200/50 shadow-sm"
                      onClick={() => setCurrentMessage("Analyze my hotel portfolio performance")}
                    >
                      📊 Portfolio Analysis
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-300 rounded-2xl px-4 py-2 text-sm font-semibold border-purple-200/50 shadow-sm"
                      onClick={() => setCurrentMessage("Help me export my data")}
                    >
                      📤 Data Export
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-300 rounded-2xl px-4 py-2 text-sm font-semibold border-orange-200/50 shadow-sm"
                      onClick={() => setCurrentMessage("Analyze my uploaded documents")}
                    >
                      🔍 Document OCR
                    </Badge>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Premium Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="relative h-12 w-12 rounded-2xl bg-white/80 hover:bg-white border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-600" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-600" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Premium Desktop Sidebar */}
        <aside className="hidden md:flex md:w-80 md:flex-col">
          <AppSidebar />
        </aside>

        {/* Ultra-Modern Main Content */}
        <main className="flex-1 relative">
          <div className="w-full min-h-[calc(100vh-5rem)]">
            <div className="w-full h-full relative overflow-hidden">
              {/* Advanced Content Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-blue-50/30 to-indigo-50/20 dark:from-gray-950/80 dark:via-slate-900/60 dark:to-gray-900/80 pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.03),transparent_50%)] pointer-events-none" />
              
              <div className="relative p-8 w-full min-h-full bg-transparent">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </div>
            </div>
          </div>

          {/* Futuristic Status Indicators */}
          <div className="fixed bottom-8 right-8 flex flex-col space-y-4 z-40">
            <div className="relative">
              <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full shadow-lg animate-pulse" />
              <div className="absolute inset-0 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-40" />
              <div className="absolute -inset-2 bg-emerald-500/20 rounded-full blur animate-pulse" />
            </div>
            <div className="relative">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-lg animate-bounce animation-delay-1000" />
              <div className="absolute -inset-1 bg-blue-500/30 rounded-full blur animate-pulse animation-delay-1000" />
            </div>
            <div className="relative">
              <div className="w-3 h-3 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full shadow-lg animate-bounce animation-delay-2000" />
              <div className="absolute -inset-1 bg-purple-500/30 rounded-full blur animate-pulse animation-delay-2000" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}