import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, TrendingUp, Target, Calendar, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

interface QuickActionsProps {
  onNewDeal?: () => void;
  onScheduleMeeting?: () => void;
  onNewTask?: () => void;
}

export const QuickActions = ({ 
  onNewDeal, 
  onScheduleMeeting, 
  onNewTask 
}: QuickActionsProps) => {
  const actions = [
    {
      title: "New Account",
      icon: Building2,
      href: "/crm/accounts",
      color: "hsl(var(--primary))",
    },
    {
      title: "New Contact",
      icon: TrendingUp,
      href: "/crm/contacts",
      color: "hsl(var(--chart-3))",
    },
    {
      title: "New Deal",
      icon: Target,
      onClick: onNewDeal,
      color: "hsl(var(--chart-4))",
    },
    {
      title: "New Task",
      icon: MessageSquare,
      onClick: onNewTask,
      color: "hsl(var(--chart-1))",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            action.href ? (
              <Button
                key={action.title}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                asChild
              >
                <Link to={action.href}>
                  <action.icon className="h-5 w-5" style={{ color: action.color }} />
                  <span className="text-sm">{action.title}</span>
                </Link>
              </Button>
            ) : (
              <Button
                key={action.title}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={action.onClick}
              >
                <action.icon className="h-5 w-5" style={{ color: action.color }} />
                <span className="text-sm">{action.title}</span>
              </Button>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
