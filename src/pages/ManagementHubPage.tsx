import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calculator, AlertTriangle, Building2, Key, Gauge } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { canAccessCRM } from "@/lib/crm/permissions";
const ManagementHubPage = () => {
  const navigate = useNavigate();
  const {
    userRole,
    loading
  } = useAuth();
  const applications = [{
    id: "crm",
    title: "CRM",
    description: "Sales & Customer Management",
    icon: Building2,
    color: "text-purple-400",
    bgColor: "bg-purple-500/15 dark:bg-purple-500/10",
    route: "/crm",
    available: true,
    buttonColor: "bg-purple-600 hover:bg-purple-700"
  }, {
    id: "timesheet",
    title: "Timesheet App",
    description: "Track and manage working hours, projects, and time entries",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/15 dark:bg-blue-500/10",
    route: "/timesheet",
    available: true,
    buttonColor: "bg-blue-600 hover:bg-blue-700"
  }, {
    id: "cost-calculator",
    title: "Cost Calculator",
    description: "Calculate project costs, budgets, and financial estimates",
    icon: Calculator,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15 dark:bg-emerald-500/10",
    route: "/cost-calculator",
    available: true,
    buttonColor: "bg-emerald-600 hover:bg-emerald-700"
  }, {
    id: "incident-management",
    title: "Incident Management",
    description: "Advanced incident tracking with monitoring and comprehensive analytics",
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-500/15 dark:bg-red-500/10",
    route: "/incident-management",
    available: true,
    buttonColor: "bg-red-600 hover:bg-red-700"
  }, {
    id: "capacity-platform",
    title: "Capacity Platform",
    description: "Resource capacity, skill coverage, work intake, and forecast",
    icon: Gauge,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/15 dark:bg-indigo-500/10",
    route: "/capacity-platform",
    available: true,
    buttonColor: "bg-indigo-600 hover:bg-indigo-700"
  }, {
    id: "api-keys",
    title: "API Keys",
    description: "Generate and manage API keys for external bots and integrations",
    icon: Key,
    color: "text-amber-400",
    bgColor: "bg-amber-500/15 dark:bg-amber-500/10",
    route: "/api-keys",
    available: true,
    buttonColor: "bg-amber-600 hover:bg-amber-700"
  }];
  const handleAppNavigation = (app: typeof applications[0]) => {
    if (app.available) {
      navigate(app.route);
    }
  };

  // Show loading state while auth is being checked or userRole not yet fetched
  if (loading || userRole === null) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>;
  }
  return <div className="min-h-screen p-4 pt-10 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-3">
            Comans Management App
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Select an application to get started with CRM, time tracking, cost calculation, or incident management
          </p>
        </div>

        {/* Application Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {applications.filter(app => {
          if (app.id === "crm" && !canAccessCRM(userRole)) return false;
          if (app.id === "cost-calculator" && !['admin', 'manager', 'sale_manager', 'sale_user'].includes(userRole || '')) return false;
          if (app.id === "incident-management" && userRole === 'customer') return false;
          if (app.id === "capacity-platform" && userRole === 'customer') return false;
          if (app.id === "api-keys" && userRole !== 'admin') return false;
          return true;
        }).map(app => {
          const IconComponent = app.icon;
          return <Card key={app.id}
                  className={`
                    relative overflow-hidden transition-all duration-300 rounded-2xl border
                    backdrop-blur-xl
                    dark:bg-white/[0.04] dark:border-white/10 dark:hover:bg-white/[0.07] dark:hover:border-white/[0.18]
                    bg-white/75 border-white/80 hover:bg-white/90
                    dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] shadow-[0_4px_20px_rgba(0,0,0,0.07)]
                    hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)]
                    ${app.available ? 'hover:scale-[1.025] cursor-pointer' : 'cursor-not-allowed opacity-50'}
                    group
                  `}
                  onClick={() => handleAppNavigation(app)}>
                  <CardHeader className="pb-4">
                    <div className={`
                    w-14 h-14 rounded-2xl ${app.bgColor}
                    flex items-center justify-center mb-4 mx-auto
                    transition-transform duration-300 group-hover:scale-110
                    ring-1 ring-white/10
                  `}>
                      <IconComponent className={`h-7 w-7 ${app.color}`} />
                    </div>
                    <CardTitle className="text-lg text-center font-semibold text-foreground">
                      {app.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-0 pb-6">
                    <CardDescription className="text-center text-sm leading-relaxed mb-6">
                      {app.description}
                    </CardDescription>

                    <div className="flex justify-center">
                      <Button
                        className={`
                          w-full transition-all duration-300 rounded-xl font-medium
                          ${app.available
                            ? `${app.buttonColor} text-white shadow-lg hover:shadow-xl`
                            : 'bg-muted text-muted-foreground cursor-not-allowed'}
                        `}
                        disabled={!app.available}
                        onClick={e => {
                          e.stopPropagation();
                          handleAppNavigation(app);
                        }}>
                        {app.available ? 'Open App' : 'Coming Soon'}
                      </Button>
                    </div>
                  </CardContent>

                  {!app.available && <div className="absolute top-3 right-3">
                      <div className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full font-medium">
                        Coming Soon
                      </div>
                    </div>}
                </Card>;
        })}
        </div>

        {/* Footer */}
        <div className="text-center mt-14 text-xs text-muted-foreground/60">
          <p>© 2026 Comans Management App. All rights reserved.</p>
        </div>
      </div>
    </div>;
};
export default ManagementHubPage;
