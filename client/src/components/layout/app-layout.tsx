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
      content: 'Hallo! Ich bin Ihr **KI-Assistent für Beyond Bookings**. Als rollenbasierter Experte habe ich direkten Zugriff auf Ihre gesamte Plattform und kann folgende Aktionen ausführen:\n\n🏨 **Hotel-Management** - Suchen, anlegen, anreichern mit KI-Daten\n💰 **Preiskalkulation** - Erstellen, prüfen, zur Genehmigung senden\n✅ **Genehmigungsworkflow** - Status prüfen, entscheiden (Admin)\n📊 **Benachrichtigungen** - Abrufen, als gelesen markieren\n👥 **Benutzerverwaltung** - Rollen vergeben (Admin)\n📈 **Geschäftsanalysen** - Margen, Regeln, Performance\n\n*Ich erkenne automatisch Deutsch/Englisch und führe Aktionen direkt über die Plattform aus. Was kann ich für Sie tun?*',
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

  // Enhanced AI Chat mutation with function calling support
  const aiChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("/api/ai/chat", "POST", { 
        message,
        language: 'auto' // Auto-detect language
      });
      return await response.json();
    },
    onSuccess: (response: any) => {
      console.log('🤖 AI Response received:', response);
      
      // Format message with context if available
      let messageContent = response?.message;
      
      // If no message, use fallback
      if (!messageContent || messageContent.trim() === '') {
        messageContent = response.language === 'de' ? 
          'Entschuldigung, ich konnte Ihre Anfrage nicht verarbeiten. Bitte versuchen Sie es erneut.' :
          'I apologize, but I encountered an issue processing your request. Please try again.';
      }
      
      // Add function call indicators if available
      if (response?.functionCalls && response.functionCalls.length > 0) {
        const isGerman = response.language === 'de';
        const functionInfo = response.functionCalls.map((fc: any) => {
          const funcName = fc.name;
          const success = fc.result && !fc.result.error;
          return `${success ? '✅' : '❌'} ${funcName}`;
        }).join(' • ');
        
        messageContent += `\n\n---\n**${isGerman ? 'Ausgeführte Aktionen' : 'Executed Actions'}:**\n${functionInfo}`;
      }
      
      // Add context indicators if available
      if (response?.context) {
        const ctx = response.context;
        const isGerman = response.language === 'de';
        const contextLabel = isGerman ? 'System-Kontext' : 'System Context';
        messageContent += `\n\n---\n**${contextLabel}:**\n📊 ${ctx.calculationsTotal || 0} ${isGerman ? 'Kalkulationen' : 'calculations'} • 🏨 ${ctx.hotelsTotal || 0} Hotels${ctx.notificationsUnread ? ` • 🔔 ${ctx.notificationsUnread} ${isGerman ? 'ungelesen' : 'unread'}` : ''}${ctx.approvalsPending ? ` • ⏳ ${ctx.approvalsPending} ${isGerman ? 'ausstehend' : 'pending'}` : ''}`;
      }
      
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: messageContent,
        timestamp: new Date()
      }]);
    },
    onError: (error: any) => {
      toast({
        title: "KI-Assistent Fehler / AI Assistant Error",
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
    
    // Auto-scroll to bottom
    setTimeout(() => {
      const messagesContainer = document.getElementById('ai-chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
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
      <div className="hidden lg:flex lg:flex-shrink-0 relative z-10">
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
        <header className="glass-nav h-16 flex items-center justify-between px-6 backdrop-blur-lg border-0 shadow-lg">
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
            
            {/* Modern Brand - Removed */}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* AI Status Indicator */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full glass-card">
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
              <DialogContent className="max-w-4xl h-[700px] flex flex-col bg-white border border-blue-200/30 shadow-2xl">
                <DialogHeader className="border-b border-blue-200/20 pb-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-t-lg px-6 py-4">
                  <DialogTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Beyond Bookings AI Assistant</h2>
                      <p className="text-sm text-gray-600">Powered by GPT-4o + Perplexity • Real-time Data + Web Search</p>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200/20">
                        Connected
                      </Badge>
                    </div>
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm text-gray-700">
                    Your intelligent assistant with **full access** to your hotel data, pricing calculations, platform analytics, and **real-time web search**. 
                    Ask complex questions about market trends, competitive analysis, or current industry insights.
                  </DialogDescription>
                </DialogHeader>

                {/* Chat Messages */}
                <ScrollArea className="flex-1 p-4" id="ai-chat-messages">
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
                              : 'bg-gradient-to-r from-gray-50 to-blue-50 text-gray-900 rounded-bl-none border border-gray-200'
                          }`}>
                            <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none"
                                 dangerouslySetInnerHTML={{
                                   __html: (message.content || '')
                                     .replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-700">$1</strong>')
                                     .replace(/\*(.*?)\*/g, '<em class="text-blue-600">$1</em>')
                                     .replace(/•/g, '<span class="text-green-600">•</span>')
                                     .replace(/\n\n/g, '<br/><br/>')
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
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 text-white flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="inline-block px-4 py-3 rounded-lg bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-bl-none">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              <span className="text-sm text-slate-700">AI is analyzing your data and searching for market insights...</span>
                            </div>
                            <div className="flex items-center gap-1 mt-2">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                              <span className="text-xs text-slate-500 ml-2">GPT-4o + Web Search</span>
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
                      onClick={() => setCurrentMessage("Analyze my hotel portfolio and pricing performance")}
                      className="text-xs h-7 px-3 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      🏨 Hotel Analysis
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMessage("Show me pricing optimization recommendations for my calculations")}
                      className="text-xs h-7 px-3 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      💰 Pricing Optimization
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMessage("What are the latest market trends for luxury hotels?")}
                      className="text-xs h-7 px-3 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                    >
                      📊 Market Trends
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMessage("Help me understand VAT calculations and profit margins")}
                      className="text-xs h-7 px-3 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                    >
                      📈 Financial Analysis
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMessage("Compare my hotels with industry benchmarks")}
                      className="text-xs h-7 px-3 bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                    >
                      🎯 Competitive Analysis
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMessage("What's the performance summary of my platform usage?")}
                      className="text-xs h-7 px-3 bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                    >
                      📋 Platform Summary
                    </Button>
                  </div>
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Fragen Sie mich zu Hotels, Kalkulationen, Genehmigungen oder Analysen... | Ask about hotels, calculations, approvals or analytics..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={aiChatMutation.isPending}
                      className="flex-1 bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 h-12 text-sm"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!currentMessage.trim() || aiChatMutation.isPending}
                      className="px-4 h-12 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white"
                    >
                      {aiChatMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>💡 Enter senden • Shift+Enter neue Zeile</span>
                      <span className="text-blue-600">🔧 KI führt Aktionen direkt aus</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-600 font-medium">GPT-4o + Function Calling</span>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Ultra-Modern Main Content Area */}
        <main className="flex-1 overflow-auto relative">
          <div className="w-full h-full">
            <div className="w-full h-full neo-card rounded-none relative overflow-hidden">
              {/* Content Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-green-500/5 pointer-events-none" />
              
              <div className="p-6 w-full h-full bg-transparent">
                {children}
              </div>
            </div>
          </div>

          {/* Floating Status Indicators */}
          <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-glowPulse shadow-lg" />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-twinkle animation-delay-1000" />
            <div className="w-2 h-2 bg-green-300 rounded-full animate-twinkle animation-delay-2000" />
          </div>
        </main>
      </div>
    </div>
  );
}
