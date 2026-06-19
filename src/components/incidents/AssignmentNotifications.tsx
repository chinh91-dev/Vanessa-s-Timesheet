import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, BellOff, Check, X, Mail, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AssignmentNotification {
  id: string;
  incident_id: string;
  assigned_to: string;
  assigned_by?: string;
  notification_type: string;
  assignment_type: string;
  notification_content: {
    incident_number?: string;
    incident_title?: string;
    assignee_name?: string;
    assigner_name?: string;
    priority?: string;
    due_date?: string;
  };
  delivery_status: 'pending' | 'sent' | 'failed';
  is_acknowledged: boolean;
  acknowledged_at?: string;
  sent_at?: string;
  created_at: string;
}

export function AssignmentNotifications() {
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['assignment-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignment_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AssignmentNotification[];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('assignment_notifications')
        .update({ 
          is_acknowledged: true, 
          acknowledged_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-notifications'] });
      toast({
        title: "Notification acknowledged",
        description: "The notification has been marked as read.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to acknowledge notification",
        variant: "destructive",
      });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('assignment_notifications')
        .update({ 
          is_acknowledged: true, 
          acknowledged_at: new Date().toISOString() 
        })
        .eq('is_acknowledged', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-notifications'] });
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been acknowledged.",
      });
    }
  });

  const filteredNotifications = showOnlyUnread 
    ? notifications.filter(n => !n.is_acknowledged)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_acknowledged).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return Mail;
      case 'in_app':
        return Bell;
      case 'sms':
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'sent':
        return <Badge variant="default"><Check className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatNotificationMessage = (notification: AssignmentNotification) => {
    const { notification_content, assignment_type } = notification;
    
    if (assignment_type === 'smart_assignment') {
      return `Smart assignment: ${notification_content.incident_number} - ${notification_content.incident_title} has been assigned to you based on your skills and availability.`;
    } else if (assignment_type === 'manual_assignment') {
      return `Manual assignment: ${notification_content.incident_number} - ${notification_content.incident_title} has been assigned to you by ${notification_content.assigner_name}.`;
    } else if (assignment_type === 'escalation') {
      return `Escalation: ${notification_content.incident_number} - ${notification_content.incident_title} has been escalated to you.`;
    }
    
    return `Incident ${notification_content.incident_number} has been assigned to you.`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Assignment Notifications</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
              >
                {showOnlyUnread ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                {showOnlyUnread ? 'Show All' : 'Unread Only'}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {showOnlyUnread ? 'No unread notifications' : 'No notifications found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => {
                const NotificationIcon = getNotificationIcon(notification.notification_type);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      notification.is_acknowledged 
                        ? 'bg-muted/30 border-muted' 
                        : 'bg-background border-primary/20 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          notification.is_acknowledged 
                            ? 'bg-muted text-muted-foreground' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          <NotificationIcon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {notification.notification_content.incident_number}
                            </Badge>
                            {getDeliveryStatusBadge(notification.delivery_status)}
                            <Badge variant="secondary" className="capitalize">
                              {notification.assignment_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <p className={`text-sm ${
                            notification.is_acknowledged ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {formatNotificationMessage(notification)}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {notification.sent_at && (
                              <span>
                                Sent {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                              </span>
                            )}
                            {notification.acknowledged_at && (
                              <span>
                                Read {formatDistanceToNow(new Date(notification.acknowledged_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!notification.is_acknowledged && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => acknowledgeMutation.mutate(notification.id)}
                            disabled={acknowledgeMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}