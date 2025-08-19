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
  // Component mount debugging
  useEffect(() => {
    console.log('🚀 AI Hub Component Mounted!');
    console.log('🌍 Current URL:', window.location.href);
    console.log('📍 Current pathname:', window.location.pathname);
  }, []);

  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('general');
  const [model, setModel] = useState('gpt-4o-mini');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
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
  const messages: Message[] = messagesData?.messages || [];
  const docs: any[] = docsData?.docs || [];
  
  // Minimal production debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('AI Hub:', { 
      activeThread: activeThreadId, 
      messages: messages.length,
      streaming: isStreaming
    });
  }

  // Auto-refresh threads on mount or user navigation
  useEffect(() => {
    refetchThreads();
  }, []);

  // Auto-select first thread if none is selected
  useEffect(() => {
    if (!activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].id);
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
      // Refresh threads first
      queryClient.invalidateQueries({ queryKey: ['/api/ai/threads'] });
      
      // If this was a new thread, we need to switch to it
      if (wasNewThread) {
        // Wait a bit for the threads query to update, then switch to the newest thread
        setTimeout(async () => {
          await queryClient.refetchQueries({ queryKey: ['/api/ai/threads'] });
          const updatedThreadsData = queryClient.getQueryData(['/api/ai/threads']) as any;
          console.log('Switching to new thread:', updatedThreadsData);
          if (updatedThreadsData?.threads?.length > 0) {
            // Just take the first thread which should be the newest
            const newestThread = updatedThreadsData.threads[0];
            console.log('Setting active thread to:', newestThread.id);
            setActiveThreadId(newestThread.id);
          }
        }, 300);
      } else {
        // Refresh messages for the current thread
        queryClient.invalidateQueries({ queryKey: ['/api/ai/threads', activeThreadId, 'messages'] });
      }
      
      setMessage('');
      setStreamingMessage('');
      setCitations([]);
    },
    onError: (error: any) => {
      setIsStreaming(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create new thread
  const createThread = () => {
    setActiveThreadId(null);
    setMessage('');
    setStreamingMessage('');
    setCitations([]);
    // Clear any search filters to see the new chat state
    setSearchQuery('');
    // Provide user feedback
    toast({
      title: "New Chat Created",
      description: "Ready for your next conversation",
    });
  };

  // Rename thread
  const handleRenameThread = async (threadId: number) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    
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
        await threadsQuery.refetch();
        
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
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    
    try {
      const response = await fetch(`/api/ai/threads/${threadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !thread.isPinned }),
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to update thread');
      
      // Refresh threads
      await threadsQuery.refetch();
      
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
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    
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
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    
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
        await threadsQuery.refetch();
        
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
    
    sendMessage.mutate({
      message,
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
            <Button onClick={createThread} size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0">
              <Plus className="h-3 w-3" />
            </Button>
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
                      <Button variant="ghost" size="sm" className="h-3 w-3 p-0 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-1.5 w-1.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-28">
                      <DropdownMenuItem 
                        className="text-xs py-1" 
                        onClick={() => handleRenameThread(thread.id)}
                      >
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-xs py-1"
                        onClick={() => handleTogglePin(thread.id)}
                      >
                        {thread.isPinned ? 'Unpin' : 'Pin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-xs py-1"
                        onClick={() => handleExportThread(thread.id)}
                      >
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive text-xs py-1"
                        onClick={() => handleDeleteThread(thread.id)}
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
                  <SelectItem value="gpt-4o-mini">Fast (Mini)</SelectItem>
                  <SelectItem value="gpt-4o">Smart (4o)</SelectItem>
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
                <p className="text-lg">{activeThreadId ? 'No messages yet' : 'New Chat Started'}</p>
                <p className="text-sm">Ask about calculations, database queries, documents, or anything else...</p>
                {!activeThreadId && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-md mx-auto">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">💡 Ready for a new conversation</p>
                    <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">Type your message below to start</p>
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
                      msg.content
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
            
            {/* Streaming message */}
            {isStreaming && streamingMessage && (
              <div className="flex gap-3 justify-start">
                <div className="max-w-[80%] glass-card border border-border/50 rounded-lg p-4">
                  <div className="whitespace-pre-wrap text-sm">{streamingMessage}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full" />
                    <span className="text-xs text-muted-foreground">AI is thinking...</span>
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