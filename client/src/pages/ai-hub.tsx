import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Send, 
  Plus, 
  Search, 
  Upload, 
  Pin, 
  MoreVertical, 
  Download, 
  Trash2,
  Brain,
  Calculator,
  Database,
  FileText,
  Globe,
  Sparkles,
  Settings
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/useRole';
import AppLayout from '@/components/layout/app-layout';

interface Thread {
  id: number;
  title: string;
  mode: string;
  isPinned: boolean;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  citations?: Citation[];
}

interface Citation {
  type: 'calculation' | 'database' | 'document' | 'api';
  source: string;
  content?: string;
  reference?: string;
}

interface ChatStreamChunk {
  type: 'message' | 'tool_call' | 'citation' | 'error' | 'done';
  content?: string;
  toolCall?: any;
  citation?: Citation;
  error?: string;
}

// Helper function to format markdown-like text to React elements
function formatMessage(text: string) {
  if (!text) return text;
  
  // Split by lines to handle line breaks and paragraphs
  const lines = text.split('\n');
  const formattedLines: React.ReactNode[] = [];
  
  lines.forEach((line, lineIndex) => {
    // Handle headers (####, ###, ##, #)
    if (line.startsWith('####')) {
      formattedLines.push(
        <h4 key={lineIndex} className="text-sm font-bold mt-3 mb-1">
          {formatInlineText(line.replace(/^####\s*/, ''))}
        </h4>
      );
    } else if (line.startsWith('###')) {
      formattedLines.push(
        <h3 key={lineIndex} className="text-base font-bold mt-3 mb-1">
          {formatInlineText(line.replace(/^###\s*/, ''))}
        </h3>
      );
    } else if (line.startsWith('##')) {
      formattedLines.push(
        <h2 key={lineIndex} className="text-lg font-bold mt-3 mb-2">
          {formatInlineText(line.replace(/^##\s*/, ''))}
        </h2>
      );
    } else if (line.startsWith('#')) {
      formattedLines.push(
        <h1 key={lineIndex} className="text-xl font-bold mt-3 mb-2">
          {formatInlineText(line.replace(/^#\s*/, ''))}
        </h1>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Handle list items
      formattedLines.push(
        <li key={lineIndex} className="ml-4 list-disc">
          {formatInlineText(line.replace(/^[-*]\s*/, ''))}
        </li>
      );
    } else if (line.trim() === '') {
      // Handle empty lines as paragraph breaks
      formattedLines.push(<br key={lineIndex} />);
    } else {
      // Handle regular text
      formattedLines.push(
        <span key={lineIndex}>
          {formatInlineText(line)}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    }
  });
  
  return <div className="space-y-1">{formattedLines}</div>;
}

// Helper function to format inline markdown (bold, italic, links)
function formatInlineText(text: string): React.ReactNode {
  if (!text) return text;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Combined regex for all inline formats
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|_([^_]+)_|\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    if (match[1]) {
      // Bold with **
      parts.push(<strong key={match.index} className="font-bold">{match[1]}</strong>);
    } else if (match[2]) {
      // Italic with *
      parts.push(<em key={match.index} className="italic">{match[2]}</em>);
    } else if (match[3]) {
      // Bold with __
      parts.push(<strong key={match.index} className="font-bold">{match[3]}</strong>);
    } else if (match[4]) {
      // Italic with _
      parts.push(<em key={match.index} className="italic">{match[4]}</em>);
    } else if (match[5] && match[6]) {
      // Link [text](url)
      parts.push(
        <a 
          key={match.index} 
          href={match[6]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {match[5]}
        </a>
      );
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
}

const modeIcons: Record<string, any> = {
  general: Brain,
  calculation: Calculator,
  docs: FileText,
  sql: Database,
  sheets: FileText,
  api: Globe,
};

const modeColors: Record<string, string> = {
  general: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  calculation: 'bg-green-500/10 text-green-500 border-green-500/20',
  docs: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  sql: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  sheets: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  api: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function AIHub() {
  const { isAdmin } = useRole();
  
  // Component mount debugging
  useEffect(() => {
    console.log('🚀 AI Hub Component Mounted!');
    console.log('🌍 Current URL:', window.location.href);
    console.log('📍 Current pathname:', window.location.pathname);
  }, []);

  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('general');
  const [model, setModel] = useState('gpt-5-mini');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get threads
  const { data: threadsData, error: threadsError, isLoading: threadsLoading, refetch: refetchThreads } = useQuery({
    queryKey: ['/api/ai/threads'],
    queryFn: async () => {
      const response = await apiRequest('/api/ai/threads');
      return response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Get messages for active thread
  const { data: messagesData } = useQuery({
    queryKey: ['/api/ai/threads', activeThreadId, 'messages'],
    queryFn: async () => {
      const response = await apiRequest(`/api/ai/threads/${activeThreadId}/messages`);
      return response.json();
    },
    enabled: !!activeThreadId,
    staleTime: 0,
    gcTime: 0, // Immediately garbage collect when not in use
  });

  // Get user documents
  const { data: docsData } = useQuery({
    queryKey: ['/api/ai/docs'],
    queryFn: async () => {
      const response = await apiRequest('/api/ai/docs');
      return response.json();
    },
  });

  const threads: Thread[] = threadsData?.threads || [];
  // Only show messages if we have an active thread, otherwise empty array
  const messages: Message[] = activeThreadId ? (messagesData?.messages || []) : [];
  const docs: any[] = docsData?.docs || [];
  
  console.log('AI Hub:', { 
    activeThread: activeThreadId, 
    messages: messages.length, 
    streaming: isStreaming,
    messagesData: messagesData?.messages?.length || 0,
    rawMessages: JSON.stringify(messages.slice(0, 2)) // Debug first 2 messages
  });

  // Auto-refresh threads on mount or user navigation
  useEffect(() => {
    refetchThreads();
  }, []);

  // Auto-select first thread if none is selected (but NOT when we explicitly cleared it)
  useEffect(() => {
    if (!activeThreadId && threads.length > 0) {
      // Only auto-select if we haven't explicitly cleared the thread (new chat scenario)
      // Check if this is a natural page load vs explicit clear
      const isExplicitClear = sessionStorage.getItem('ai-hub-new-chat');
      if (!isExplicitClear) {
        setActiveThreadId(threads[0].id);
      } else {
        // Clear the flag after using it
        sessionStorage.removeItem('ai-hub-new-chat');
      }
    }
  }, [threads, activeThreadId]);

  // Filter threads based on search
  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ message, threadId, mode, model, title }: any) => {
      const isNewThread = !threadId;
      setIsStreaming(true);
      setStreamingMessage('');
      setCitations([]);
      // Don't clear pendingUserMessage here - keep it visible during streaming

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, threadId: threadId || undefined, mode, model, title }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      let accumulatedMessage = '';
      const accumulatedCitations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsStreaming(false);
              return isNewThread; // Return flag to indicate if this was a new thread
            }
            
            try {
              const parsed: ChatStreamChunk = JSON.parse(data);
              
              if (parsed.type === 'message' && parsed.content) {
                accumulatedMessage += parsed.content;
                setStreamingMessage(accumulatedMessage);
              } else if (parsed.type === 'citation' && parsed.citation) {
                accumulatedCitations.push(parsed.citation);
                setCitations([...accumulatedCitations]);
              } else if (parsed.type === 'error') {
                toast({
                  title: "Error",
                  description: parsed.error,
                  variant: "destructive",
                });
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    },
    onSuccess: (wasNewThread) => {
      console.log('Chat success callback, wasNewThread:', wasNewThread);
      
      // Always refresh threads to ensure we have the latest list
      queryClient.invalidateQueries({ queryKey: ['/api/ai/threads'] });
      
      // If this was a new thread, we need to switch to it
      if (wasNewThread) {
        // Wait for threads to refresh, then switch to the newest thread
        setTimeout(async () => {
          try {
            await queryClient.refetchQueries({ queryKey: ['/api/ai/threads'] });
            const updatedThreadsData = queryClient.getQueryData(['/api/ai/threads']) as any;
            console.log('Updated threads data:', updatedThreadsData);
            
            if (updatedThreadsData?.threads?.length > 0) {
              // Get the newest thread (first in the list)
              const newestThread = updatedThreadsData.threads[0];
              console.log('Setting active thread to:', newestThread.id);
              setActiveThreadId(newestThread.id);
              
              // Invalidate messages cache for the new thread
              queryClient.invalidateQueries({ 
                queryKey: ['/api/ai/threads', newestThread.id, 'messages'] 
              });
            }
          } catch (error) {
            console.error('Error switching to new thread:', error);
          }
        }, 500); // Increased timeout for better reliability
      } else if (activeThreadId) {
        // Refresh messages for the current thread and clear pending message
        queryClient.invalidateQueries({ 
          queryKey: ['/api/ai/threads', activeThreadId, 'messages'] 
        });
        // Clear pending message immediately since it's now saved
        setPendingUserMessage('');
      }
      
      // Clear streaming state and pending message since it's now saved  
      setIsStreaming(false);
      setStreamingMessage('');
      setCitations([]);
      setPendingUserMessage('');
    },
    onError: (error: any) => {
      setIsStreaming(false);
      setPendingUserMessage('');
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create new thread
  const createThread = () => {
    console.log('Creating new thread...');
    
    // Mark that this is an explicit new chat action
    sessionStorage.setItem('ai-hub-new-chat', 'true');
    
    // Clear current state immediately
    const previousThreadId = activeThreadId;
    setActiveThreadId(null);
    setMessage('');
    setStreamingMessage('');
    setCitations([]);
    setPendingUserMessage('');
    setSearchQuery('');
    
    // Clear ALL message-related cached data
    queryClient.removeQueries({ 
      queryKey: ['/api/ai/threads'],
      exact: false 
    });
    
    // Specifically clear the previous thread's messages if it existed
    if (previousThreadId) {
      queryClient.removeQueries({
        queryKey: ['/api/ai/threads', previousThreadId, 'messages']
      });
    }
    
    // Force immediate empty state
    queryClient.setQueryData(['/api/ai/threads', null, 'messages'], { messages: [] });
    
    console.log('New thread created - all state and cache cleared');
    
    // Provide user feedback
    toast({
      title: "New Chat Created",
      description: "Ready for your next conversation",
    });
  };

  // Advanced clear all chats with multiple options
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [clearOption, setClearOption] = useState<'all' | 'unpinned' | 'older_than'>('all');
  const [olderThanDays, setOlderThanDays] = useState(30);
  
  const clearAllChats = useMutation({
    mutationFn: (options: { type: 'all' | 'unpinned' | 'older_than', days?: number }) => 
      apiRequest('/api/ai/threads/clear', 'POST', options),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/threads'] });
      setActiveThreadId(null);
      // Clear current messages display
      setClearAllDialogOpen(false);
      
      toast({
        title: "🧹 Chats Cleared Successfully",
        description: `${result.deletedCount} chat threads were cleared. ${result.preservedCount > 0 ? `${result.preservedCount} pinned chats preserved.` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Clear Failed", 
        description: error.message || "Unable to clear chats. Please try again.",
        variant: "destructive"
      });
    }
  });

  const getThreadStats = () => {
    const total = threads.length;
    const pinned = threads.filter(t => t.isPinned).length;
    const unpinned = total - pinned;
    const oldChats = threads.filter(t => {
      const threadDate = new Date(t.createdAt);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      return threadDate < cutoffDate;
    }).length;
    
    return { total, pinned, unpinned, oldChats };
  };

  // Rename thread
  const handleRenameThread = async (threadId: number) => {
    console.log('🔧 handleRenameThread called with threadId:', threadId);
    const thread = threads.find(t => t.id === threadId);
    if (!thread) {
      console.log('❌ Thread not found for ID:', threadId);
      return;
    }
    
    const newTitle = prompt('Enter new thread title:', thread.title);
    if (newTitle && newTitle !== thread.title) {
      try {
        const response = await fetch(`/api/ai/threads/${threadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
          credentials: 'include',
        });
        
        if (!response.ok) throw new Error('Failed to rename thread');
        
        // Refresh threads
        await refetchThreads();
        
        toast({
          title: "Thread Renamed",
          description: `Renamed to: ${newTitle}`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to rename thread",
          variant: "destructive"
        });
      }
    }
  };

  // Toggle pin thread
  const handleTogglePin = async (threadId: number) => {
    console.log('📌 handleTogglePin called with threadId:', threadId);
    const thread = threads.find(t => t.id === threadId);
    if (!thread) {
      console.log('❌ Thread not found for ID:', threadId);
      return;
    }
    
    try {
      const response = await fetch(`/api/ai/threads/${threadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !thread.isPinned }),
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to update thread');
      
      // Refresh threads
      await refetchThreads();
      
      toast({
        title: thread.isPinned ? "Thread Unpinned" : "Thread Pinned",
        description: thread.isPinned ? "Thread removed from favorites" : "Thread added to favorites",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update thread",
        variant: "destructive"
      });
    }
  };

  // Export thread
  const handleExportThread = (threadId: number) => {
    console.log('💾 handleExportThread called with threadId:', threadId);
    const thread = threads.find(t => t.id === threadId);
    if (!thread) {
      console.log('❌ Thread not found for ID:', threadId);
      return;
    }
    
    // Get messages for this thread
    const threadMessages = messagesData?.messages || [];
    
    const exportData = {
      title: thread.title,
      mode: thread.mode,
      createdAt: thread.createdAt,
      messages: threadMessages
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thread-${thread.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Thread Exported",
      description: "Thread saved as JSON file",
    });
  };

  // Delete thread
  const handleDeleteThread = async (threadId: number) => {
    console.log('🗑️ handleDeleteThread called with threadId:', threadId);
    const thread = threads.find(t => t.id === threadId);
    if (!thread) {
      console.log('❌ Thread not found for ID:', threadId);
      return;
    }
    
    if (confirm(`Delete thread "${thread.title}"? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/ai/threads/${threadId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        if (!response.ok) throw new Error('Failed to delete thread');
        
        // Clear active thread if it was deleted
        if (activeThreadId === threadId) {
          setActiveThreadId(null);
        }
        
        // Refresh threads
        await refetchThreads();
        
        toast({
          title: "Thread Deleted",
          description: "Thread has been permanently deleted",
          variant: "destructive"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete thread",
          variant: "destructive"
        });
      }
    }
  };

  // File upload functions
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/ai/ingest', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        return await response.json();
      });
      
      const results = await Promise.all(uploadPromises);
      const fileNames = results.map(r => r.filename).join(', ');
      
      toast({
        title: "Files Uploaded Successfully",
        description: `Uploaded: ${fileNames}`,
      });
      
      // Refresh documents list if available
      // docsQuery?.refetch();
      
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
        variant: "destructive"
      });
    }
    
    setIsUploadOpen(false);
    e.target.value = ''; // Reset input
  };

  // Handle send
  const handleSend = () => {
    if (!message.trim() || isStreaming) return;

    const title = activeThreadId ? undefined : message.substring(0, 50);
    
    // Immediately show user message in chat
    setPendingUserMessage(message.trim());
    
    // Clear input immediately for better UX
    const messageToSend = message.trim();
    setMessage('');
    
    sendMessage.mutate({
      message: messageToSend,
      threadId: activeThreadId || undefined, // Convert null to undefined
      mode,
      model,
      title,
    });
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Show error page if routing or authentication is broken
  if (threadsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">AI Hub Error</h1>
          <p className="text-gray-600 mb-4">Error: {threadsError.message}</p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] bg-background">
        {/* Debug Panel - Hidden */}
        {false && (
          <div className="fixed top-4 right-4 z-50 bg-black text-white p-2 rounded text-xs max-w-sm opacity-50 hover:opacity-100 transition-opacity">
            <div>🔍 Debug</div>
            <div>Thread: {activeThreadId}</div>
            <div>Messages: {messages.length}</div>
            <div>Status: {isStreaming ? 'streaming' : 'ready'}</div>
          </div>
        )}
        
      {/* Sidebar */}
      <div className="w-80 border-r glass-card border-border/50 flex flex-col">
        {/* Header */}
        <div className="p-2.5 border-b border-border/50">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              <h1 className="font-medium text-sm">AI Hub</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button onClick={createThread} size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0">
                <Plus className="h-3 w-3" />
              </Button>
              <Dialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Clear chats"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5 text-destructive" />
                      Smart Chat Cleanup
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Stats Overview */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2">Current Overview</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Chats:</span>
                          <span className="ml-2 font-medium">{getThreadStats().total}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pinned:</span>
                          <span className="ml-2 font-medium text-blue-600">{getThreadStats().pinned}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unpinned:</span>
                          <span className="ml-2 font-medium">{getThreadStats().unpinned}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Older than {olderThanDays}d:</span>
                          <span className="ml-2 font-medium">{getThreadStats().oldChats}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cleanup Options */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Cleanup Options</h4>
                      
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                          <input
                            type="radio"
                            name="clearOption"
                            value="unpinned"
                            checked={clearOption === 'unpinned'}
                            onChange={(e) => setClearOption(e.target.value as any)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">📌 Clear Unpinned Chats Only</div>
                            <div className="text-xs text-muted-foreground">Keep all pinned conversations safe - recommended option</div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {getThreadStats().unpinned} chats
                          </Badge>
                        </label>

                        <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                          <input
                            type="radio"
                            name="clearOption"
                            value="older_than"
                            checked={clearOption === 'older_than'}
                            onChange={(e) => setClearOption(e.target.value as any)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">Clear Old Chats</div>
                            <div className="text-xs text-muted-foreground">Remove conversations older than specified days</div>
                            {clearOption === 'older_than' && (
                              <div className="mt-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max="365"
                                  value={olderThanDays}
                                  onChange={(e) => setOlderThanDays(parseInt(e.target.value) || 30)}
                                  className="w-20 h-8 text-xs"
                                  placeholder="30"
                                />
                                <span className="text-xs text-muted-foreground ml-2">days</span>
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {getThreadStats().oldChats} chats
                          </Badge>
                        </label>

                        <label className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 cursor-pointer hover:bg-destructive/5 transition-colors">
                          <input
                            type="radio"
                            name="clearOption"
                            value="all"
                            checked={clearOption === 'all'}
                            onChange={(e) => setClearOption(e.target.value as any)}
                            className="w-4 h-4 text-destructive"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-destructive">Clear Everything</div>
                            <div className="text-xs text-muted-foreground">Remove all conversations including pinned ones</div>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            {getThreadStats().total} chats
                          </Badge>
                        </label>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center mt-0.5">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium text-amber-800 dark:text-amber-200">Action cannot be undone</div>
                          <div className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                            Cleared conversations and their messages will be permanently deleted
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setClearAllDialogOpen(false)}
                        disabled={clearAllChats.isPending}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => clearAllChats.mutate({ 
                          type: clearOption, 
                          days: clearOption === 'older_than' ? olderThanDays : undefined 
                        })}
                        disabled={clearAllChats.isPending || (
                          clearOption === 'unpinned' && getThreadStats().unpinned === 0
                        ) || (
                          clearOption === 'older_than' && getThreadStats().oldChats === 0
                        )}
                        className="min-w-20"
                      >
                        {clearAllChats.isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                            Clearing...
                          </div>
                        ) : (
                          `Clear ${
                            clearOption === 'all' ? getThreadStats().total :
                            clearOption === 'unpinned' ? getThreadStats().unpinned :
                            getThreadStats().oldChats
                          } chats`
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
        </div>

        {/* Threads List */}
        <ScrollArea className="flex-1 p-1.5">
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
              className={cn(
                "p-1.5 rounded cursor-pointer mb-0.5 transition-colors hover:bg-accent/50 group relative",
                activeThreadId === thread.id ? "bg-accent text-accent-foreground" : "bg-background/30 hover:bg-background/60"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-xs truncate flex-1 pr-1 leading-tight">{thread.title}</h3>
                <div className="flex items-center gap-0.5 shrink-0">
                  {thread.isPinned && <Pin className="h-2 w-2 text-blue-500" />}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-3 w-3 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <MoreVertical className="h-1.5 w-1.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-28">
                      <DropdownMenuItem 
                        className="text-xs py-1" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRenameThread(thread.id);
                        }}
                      >
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-xs py-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleTogglePin(thread.id);
                        }}
                      >
                        {thread.isPinned ? 'Unpin' : 'Pin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-xs py-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleExportThread(thread.id);
                        }}
                      >
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive text-xs py-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteThread(thread.id);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>

        {/* Upload Button */}
        <div className="p-1.5 border-t border-border/50">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full h-7" size="sm">
                <Upload className="h-2.5 w-2.5 mr-1.5" />
                <span className="text-xs">Upload</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop files or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports: PDF, DOC, DOCX, TXT, MD, CSV, XLSX (Max 50MB)
                  </p>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx"
                    multiple
                  />
                </div>
                <Button onClick={triggerFileUpload} className="w-full">Upload</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border/50 glass-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">
                {activeThreadId 
                  ? threads.find(t => t.id === activeThreadId)?.title || 'Chat'
                  : 'New Chat'
                }
              </h2>
              {activeThreadId && (
                <Badge variant="outline" className={cn("text-xs", modeColors[mode])}>
                  {React.createElement(modeIcons[mode], { className: "h-3 w-3 mr-1" })}
                  {mode}
                </Badge>
              )}
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="calculation">Calculator</SelectItem>
                  <SelectItem value="docs">Documents</SelectItem>
                  <SelectItem value="sql">Database</SelectItem>
                  <SelectItem value="sheets">Sheets</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5-mini">Fast (5 Mini) ⚡</SelectItem>
                  <SelectItem value="gpt-5">Smart (GPT-5) 🚀</SelectItem>
                  <SelectItem value="gpt-5-preview">GPT-5 Preview 🌟</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 && !isStreaming && (
              <div className="text-center text-muted-foreground mt-12">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{activeThreadId ? 'No messages yet' : 'Ready for a new chat'}</p>
                <p className="text-sm">Ask about calculations, database queries, documents, or anything else...</p>
                {!activeThreadId && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-md mx-auto">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">💡 New conversation ready</p>
                    <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">Type your message below to start chatting</p>
                  </div>
                )}
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={cn(
                "flex gap-3 mb-4",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}>
                <div className={cn(
                  "max-w-[80%] rounded-lg p-4",
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-12' 
                    : 'glass-card border border-border/50'
                )}>
                  <div className="whitespace-pre-wrap text-sm">
                    {msg.content && msg.content.includes('Tool Result') ? (
                      <div className="space-y-2">
                        {/* Parse and format tool results */}
                        {(() => {
                          try {
                            // Extract the JSON from Tool Result format
                            const toolMatch = msg.content.match(/Tool Result \([^)]+\): ({.*})/);
                            if (toolMatch) {
                              const result = JSON.parse(toolMatch[1]);
                              
                              if (result.rows && Array.isArray(result.rows)) {
                                return (
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground mb-2">Database Query Result</div>
                                    {result.rows.length > 0 ? (
                                      <div className="space-y-1">
                                        {result.rows.slice(0, 3).map((row: any, idx: number) => (
                                          <div key={idx} className="text-xs bg-white dark:bg-slate-700 rounded p-2 font-mono">
                                            {typeof row === 'object' ? (
                                              <div className="space-y-1">
                                                {Object.entries(row).map(([key, value]) => (
                                                  <div key={key} className="flex gap-2">
                                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{key}:</span>
                                                    <span className="text-gray-700 dark:text-gray-300">{String(value)}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : String(row)}
                                          </div>
                                        ))}
                                        {result.rows.length > 3 && (
                                          <div className="text-xs text-muted-foreground">... and {result.rows.length - 3} more rows</div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-muted-foreground">No results found</div>
                                    )}
                                  </div>
                                );
                              } else if (result.result !== undefined) {
                                return (
                                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground mb-2">Calculation Result</div>
                                    <div className="text-lg font-mono">{result.result}</div>
                                    {result.steps && (
                                      <div className="mt-2 text-xs text-muted-foreground">
                                        {result.steps.join(' → ')}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else if (result.error) {
                                return (
                                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground mb-2">Error</div>
                                    <div className="text-sm text-red-600 dark:text-red-400">{result.error}</div>
                                  </div>
                                );
                              }
                            }
                            
                            // Fallback to original content
                            return <span>{msg.content}</span>;
                          } catch (e) {
                            return <span>{msg.content}</span>;
                          }
                        })()}
                      </div>
                    ) : (
                      formatMessage(msg.content)
                    )}
                  </div>
                  
                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.citations.map((citation, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {citation.source}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Pending user message - shown immediately when user sends */}
            {pendingUserMessage && (
              <div className="flex gap-3 justify-end mb-4">
                <div className="max-w-[80%] bg-primary text-primary-foreground ml-12 rounded-lg p-4">
                  <div className="whitespace-pre-wrap text-sm">{pendingUserMessage}</div>
                </div>
              </div>
            )}

            {isStreaming && !streamingMessage && (
              <div className="flex gap-3 justify-start mb-4">
                <div className="max-w-[80%] glass-card border border-border/50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">AI is researching and thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* AI streaming response */}
            {isStreaming && streamingMessage && (
              <div className="flex gap-3 justify-start">
                <div className="max-w-[80%] glass-card border border-border/50 rounded-lg p-4">
                  <div className="text-sm">{formatMessage(streamingMessage)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="animate-pulse h-2 w-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-muted-foreground">AI is responding...</span>
                  </div>
                  
                  {/* Live citations */}
                  {citations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {citations.map((citation, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {citation.source}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50 glass-card">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about calculations, database queries, documents, or anything else..."
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isStreaming}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}