import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  ExternalLink,
  MarkAsUnread,
  CheckCheck,
  AlertCircle,
  Star,
  DollarSign
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Notification {
  id: number;
  type: 'approval_pending' | 'approval_approved' | 'approval_rejected';
  title: string;
  message: string;
  approvalRequestId?: number;
  calculationId?: number;
  status: 'unread' | 'read';
  createdAt: string;
  readAt?: string;
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
}

const NotificationCard = ({ notification, onMarkAsRead }: NotificationCardProps) => {
  const getTypeIcon = () => {
    switch (notification.type) {
      case 'approval_pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'approval_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'approval_rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = () => {
    if (notification.status === 'unread') {
      return <Badge variant="default" className="text-xs">Unread</Badge>;
    }
    return null;
  };

  const getActionLink = () => {
    if (notification.type === 'approval_pending' && notification.approvalRequestId) {
      return `/approvals?request=${notification.approvalRequestId}`;
    }
    if (notification.calculationId) {
      return `/calculations?calculation=${notification.calculationId}`;
    }
    return null;
  };

  const handleClick = () => {
    if (notification.status === 'unread') {
      onMarkAsRead(notification.id);
    }
    
    const link = getActionLink();
    if (link) {
      window.location.href = link;
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        notification.status === 'unread' 
          ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 pt-1">
            {getTypeIcon()}
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate pr-2">
                {notification.title}
              </h4>
              <div className="flex items-center space-x-2 flex-shrink-0">
                {getStatusBadge()}
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </div>
            </div>
            
            <div 
              className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3"
              dangerouslySetInnerHTML={{ 
                __html: notification.message.replace(/<[^>]*>/g, ' ').substring(0, 120) + '...' 
              }}
            />
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {formatDistanceToNow(new Date(notification.createdAt), { 
                  addSuffix: true,
                  locale: de 
                })}
              </span>
              {notification.type === 'approval_pending' && (
                <Badge variant="outline" className="text-xs">
                  Pending Review
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function Notifications() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['/api/notifications', selectedStatus],
    queryFn: async () => {
      const response = await apiRequest(`/api/notifications?status=${selectedStatus}&limit=20`);
      return response.json();
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Get unread count
  const { data: countData } = useQuery({
    queryKey: ['/api/notifications/count'],
    queryFn: async () => {
      const response = await apiRequest('/api/notifications/count');
      return response.json();
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest(`/api/notifications/${notificationId}/read`, 'PATCH');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/notifications/mark-all-read', 'POST');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = countData?.unread || 0;

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const filteredNotifications = notifications.filter((notification: Notification) => {
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'unread') return notification.status === 'unread';
    if (selectedStatus === 'pending') return notification.type === 'approval_pending';
    if (selectedStatus === 'approved') return notification.type === 'approval_approved';
    if (selectedStatus === 'declined') return notification.type === 'approval_rejected';
    return true;
  });

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-white to-purple-50 rounded-2xl opacity-60"></div>
      <Card className="relative glass-card border-purple-200/30 rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Benachrichtigungen</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {user?.role === 'admin' 
                  ? 'Approval requests and system updates'
                  : 'Your approval status updates'
                }
              </CardDescription>
            </div>
            
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="space-y-4">
            <TabsList className="grid grid-cols-3 lg:grid-cols-5 w-full text-xs">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs">Approved</TabsTrigger>
              <TabsTrigger value="declined" className="text-xs">Declined</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-64">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground text-sm">No notifications found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedStatus === 'all' 
                      ? 'You\'re all caught up!' 
                      : `No ${selectedStatus} notifications`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification: Notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}