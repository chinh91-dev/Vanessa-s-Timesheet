import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, X, CheckCircle, AlertTriangle, Clock, Users, UserX } from 'lucide-react';
import { supabaseOHS as supabase } from '@/integrations/supabase-ohs/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'hazard_overdue' | 'inspection_required' | 'injury_followup' | 'review_due' | 'escalation' | 'hr_incident_stale' | 'hr_incident_review';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  entityType: string;
  entityId: string;
  createdAt: string;
  read: boolean;
}

const OHSNotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    // Set up real-time updates
    const interval = setInterval(loadNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      // Generate notifications based on current data
      const generatedNotifications = await generateNotifications();
      setNotifications(generatedNotifications);
      setUnreadCount(generatedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNotifications = async (): Promise<Notification[]> => {
    const notifications: Notification[] = [];
    const now = new Date();

    try {
      // Check for overdue hazards
      const { data: overdueHazards } = await supabase
        .from('ohs_hazard_reports')
        .select('*')
        .in('status', ['Open', 'In Progress'])
        .not('due_date', 'is', null)
        .lt('due_date', now.toISOString());

      overdueHazards?.forEach(hazard => {
        notifications.push({
          id: `hazard_overdue_${hazard.id}`,
          type: 'hazard_overdue',
          title: 'Overdue Hazard Report',
          message: `Hazard "${hazard.title}" is overdue for action`,
          priority: hazard.initial_risk_rating >= 15 ? 'urgent' : 'high',
          entityType: 'hazard',
          entityId: hazard.id,
          createdAt: now.toISOString(),
          read: false,
        });
      });

      // Check for areas that were previously inspected but not in the last 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Get all distinct areas that have ever been inspected
      const { data: allInspectedAreas } = await supabase
        .from('ohs_workplace_inspections')
        .select('site_area');
      
      const allAreas = new Set(allInspectedAreas?.map(i => i.site_area) || []);
      
      // Get areas inspected in the last 30 days
      const { data: recentInspections } = await supabase
        .from('ohs_workplace_inspections')
        .select('site_area')
        .gte('inspection_date', thirtyDaysAgo.toISOString());

      const recentAreas = new Set(recentInspections?.map(i => i.site_area) || []);
      
      allAreas.forEach(area => {
        if (!recentAreas.has(area)) {
          notifications.push({
            id: `inspection_required_${area}`,
            type: 'inspection_required',
            title: 'Inspection Required',
            message: `${area} requires inspection (not inspected in 30 days)`,
            priority: 'medium',
            entityType: 'inspection',
            entityId: area,
            createdAt: now.toISOString(),
            read: false,
          });
        }
      });

      // Check for injury follow-ups
      const { data: overdueFollowups } = await supabase
        .from('ohs_injury_registers')
        .select('*')
        .eq('follow_up_required', true)
        .not('follow_up_date', 'is', null)
        .lt('follow_up_date', now.toISOString())
        .neq('status', 'Closed');

      overdueFollowups?.forEach(injury => {
        notifications.push({
          id: `injury_followup_${injury.id}`,
          type: 'injury_followup',
          title: 'Injury Follow-up Required',
          message: `Follow-up required for injury involving ${injury.injured_person_name}`,
          priority: ['Lost Time', 'Permanent Disability', 'Fatality'].includes(injury.injury_severity) ? 'urgent' : 'high',
          entityType: 'injury',
          entityId: injury.id,
          createdAt: now.toISOString(),
          read: false,
        });
      });

      // Check for items due for review
      const { data: reviewDue } = await supabase
        .from('ohs_hazard_reports')
        .select('*')
        .not('review_date', 'is', null)
        .lte('review_date', now.toISOString())
        .neq('status', 'Closed');

      reviewDue?.forEach(hazard => {
        notifications.push({
          id: `review_due_${hazard.id}`,
          type: 'review_due',
          title: 'Review Due',
          message: `Hazard "${hazard.title}" is due for review`,
          priority: 'medium',
          entityType: 'hazard',
          entityId: hazard.id,
          createdAt: now.toISOString(),
          read: false,
        });
      });

      // Check for stale HR incidents (open/in progress older than 7 days)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: staleHRIncidents } = await supabase
        .from('ohs_hr_incidents')
        .select('*')
        .in('status', ['Open', 'In Progress'])
        .lt('created_at', sevenDaysAgo.toISOString());

      staleHRIncidents?.forEach(incident => {
        notifications.push({
          id: `hr_incident_stale_${incident.id}`,
          type: 'hr_incident_stale',
          title: 'Stale HR Incident',
          message: `HR incident "${incident.incident_report_number || incident.id}" has been open for over 7 days`,
          priority: 'high',
          entityType: 'hr_incident',
          entityId: incident.id,
          createdAt: now.toISOString(),
          read: false,
        });
      });

      // Check for HR incidents pending review
      const { data: reviewHRIncidents } = await supabase
        .from('ohs_hr_incidents')
        .select('*')
        .eq('status', 'Under Review');

      reviewHRIncidents?.forEach(incident => {
        notifications.push({
          id: `hr_incident_review_${incident.id}`,
          type: 'hr_incident_review',
          title: 'HR Incident Pending Review',
          message: `HR incident "${incident.incident_report_number || incident.id}" is awaiting review`,
          priority: 'medium',
          entityType: 'hr_incident',
          entityId: incident.id,
          createdAt: now.toISOString(),
          read: false,
        });
      });

    } catch (error) {
      console.error('Error generating notifications:', error);
    }

    return notifications.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === notificationId);
      return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hazard_overdue': return <AlertTriangle className="h-4 w-4" />;
      case 'inspection_required': return <CheckCircle className="h-4 w-4" />;
      case 'injury_followup': return <Users className="h-4 w-4" />;
      case 'review_due': return <Clock className="h-4 w-4" />;
      case 'hr_incident_stale': return <UserX className="h-4 w-4" />;
      case 'hr_incident_review': return <UserX className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark All Read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notifications at this time</p>
            <p className="text-sm">All OHS items are up to date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 10).map((notification) => (
              <Alert
                key={notification.id}
                className={`${getPriorityColor(notification.priority)} ${
                  notification.read ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(notification.priority)}`}
                        >
                          {getPriorityIcon(notification.priority)}
                          {notification.priority}
                        </Badge>
                      </div>
                      <AlertDescription className="text-sm">
                        {notification.message}
                      </AlertDescription>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-8 w-8 p-0"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotification(notification.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Alert>
            ))}
            
            {notifications.length > 10 && (
              <div className="text-center py-2">
                <Button variant="outline" size="sm">
                  View All {notifications.length} Notifications
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OHSNotificationCenter;