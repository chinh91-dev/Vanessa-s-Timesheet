import React, { lazy, Suspense, useEffect, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes"; // Theme support for dark/light/system mode
import { AuthProvider } from "@/context/AuthContext";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";
import { DeviceProvider } from "@/context/DeviceContext";
import LayoutSkeleton from "@/components/common/LayoutSkeleton";

// Wrapper for lazy imports that handles chunk loading failures gracefully.
// Reloads ONCE per page session to fetch fresh chunks; if it still fails after
// reload, surface the error instead of looping infinitely.
const CHUNK_RELOAD_KEY = "chunk_reload_attempted_at";
const CHUNK_RELOAD_TTL_MS = 5 * 60 * 1000; // 5 minutes — long enough to debounce, short enough to recover from a real new deploy
const lazyWithRetry = (
  componentImport: () => Promise<{ default: ComponentType<any> }>
) => {
  return lazy(async () => {
    try {
      const mod = await componentImport();
      // Successful load — clear the retry flag so future stale-bundle situations can self-heal.
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return mod;
    } catch (error) {
      // Read prior reload timestamp; ignore (and re-attempt) if older than TTL.
      const priorRaw = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      const prior = priorRaw ? Number(priorRaw) : 0;
      const recent = Number.isFinite(prior) && Date.now() - prior < CHUNK_RELOAD_TTL_MS;
      if (recent) {
        console.error("Chunk load failed after recent reload — giving up to avoid infinite loop", error);
        throw error;
      }
      console.error("Failed to load module, reloading page once...", error);
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      // Cache-bust by adding a query param so the browser must hit network for index.html.
      const url = new URL(window.location.href);
      url.searchParams.set("_r", Date.now().toString(36));
      window.location.replace(url.toString());
      return { default: () => null };
    }
  });
};

// Preload critical routes in background after initial load.
// Wrapped in Promise.allSettled so a single failed chunk does not
// surface as an unhandled rejection in the browser console.
const preloadCriticalRoutes = () => {
  Promise.allSettled([
    import("@/pages/crm/PipelinePage"),
    import("@/pages/crm/ProspectsPage"),
    import("@/pages/crm/AccountsPage"),
    import("@/pages/crm/ContactsPage"),
    import("@/pages/crm/DealsPage"),
    import("@/pages/crm/TasksPage"),
    import("@/pages/crm/MeetingsPage"),
    import("@/pages/timesheet/TimesheetPage"),
    import("@/pages/timesheet/Index"),
  ]).then((results) => {
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.warn(`[preloadCriticalRoutes] ${failed.length} chunk(s) failed to preload`);
    }
  });
};

import MainLayout from "@/components/layout/MainLayout";
import HubLayout from "@/components/layout/HubLayout";
import CapacityAppLayout from "@/components/layout/CapacityAppLayout";
import IncidentLayout from "@/components/layout/IncidentLayout";
import AppErrorBoundary from "@/components/common/AppErrorBoundary";
// Route guards (keep as static imports - small and frequently used)
import AdminRoute from "@/routes/AdminRoute";
import ManagerRoute from "@/routes/ManagerRoute";
import CostCalculatorRoute from "@/routes/CostCalculatorRoute";
import PermanentEmployeeRoute from "@/routes/PermanentEmployeeRoute";
import ForcePasswordChangeRoute from "@/routes/ForcePasswordChangeRoute";
import CRMAdminRoute from "@/routes/CRMAdminRoute";
import CRMReportsRoute from "@/routes/CRMReportsRoute";
import CRMSaleUserRestrictedRoute from "@/routes/CRMSaleUserRestrictedRoute";
import CRMProspectsRoute from "@/routes/CRMProspectsRoute";
import CustomerPortalRoute from "@/routes/CustomerPortalRoute";

// Layouts (keep as static imports - shared across routes)
import CustomerPortalLayout from "@/components/layout/CustomerPortalLayout";
import CRMLayout from "@/components/crm/layout/CRMLayout";
import CustomerPortalRedirect from "@/components/customer-portal/CustomerPortalRedirect";

// Lazy-loaded pages for code splitting with retry mechanism
// Auth pages
const AuthPage = lazyWithRetry(() => import("@/pages/auth/AuthPage"));
const ForcePasswordChangePage = lazyWithRetry(() => import("@/pages/auth/ForcePasswordChangePage"));
const ForgotPasswordPage = lazyWithRetry(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazyWithRetry(() => import("@/pages/auth/ResetPasswordPage"));

// Hub pages
const ManagementHubPage = lazyWithRetry(() => import("@/pages/ManagementHubPage"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));

// Timesheet pages
const Dashboard = lazyWithRetry(() => import("@/pages/timesheet/Index"));
const TimesheetPage = lazyWithRetry(() => import("@/pages/timesheet/TimesheetPage"));
const ProjectsPage = lazyWithRetry(() => import("@/pages/timesheet/ProjectsPage"));
const ContractsPage = lazyWithRetry(() => import("@/pages/timesheet/ContractsPage"));
const CustomersPage = lazyWithRetry(() => import("@/pages/timesheet/CustomersPage"));
const ReportsPage = lazyWithRetry(() => import("@/pages/timesheet/ReportsPage"));
const TeamPage = lazyWithRetry(() => import("@/pages/timesheet/TeamPage"));
const WorkSchedulePage = lazyWithRetry(() => import("@/pages/timesheet/WorkSchedulePage"));
const WorkLocationPage = lazyWithRetry(() => import("@/pages/timesheet/WorkLocationPage"));
const HolidayManagementPage = lazyWithRetry(() => import("@/pages/timesheet/HolidayManagementPage"));
const LeaveApplicationPage = lazyWithRetry(() => import("@/pages/timesheet/LeaveApplicationPage"));
const LeaveManagementPage = lazyWithRetry(() => import("@/pages/timesheet/LeaveManagementPage"));
const ExpensesPage = lazyWithRetry(() => import("@/pages/timesheet/ExpensesPage"));
const SettingsPage = lazyWithRetry(() => import("@/pages/timesheet/SettingsPage"));
const ArchivePage = lazyWithRetry(() => import("@/pages/timesheet/ArchivePage"));
const OHSPage = lazyWithRetry(() => import("@/pages/timesheet/OHSPage"));

// Cost Calculator pages
const CostCalculatorPage = lazyWithRetry(() => import("@/pages/cost-calculator/CostCalculatorPage"));
const CostCalculatorSettingsPage = lazyWithRetry(() => import("@/pages/cost-calculator/CostCalculatorSettingsPage"));

// Incident Management pages
const IncidentDashboardPage = lazyWithRetry(() => import("@/pages/incident-management/IncidentDashboardPage"));
const IncidentListPage = lazyWithRetry(() => import("@/pages/incident-management/IncidentListPage"));
const IncidentProjectsPage = lazyWithRetry(() => import("@/pages/incident-management/IncidentProjectsPage"));
const IncidentDetailPage = lazyWithRetry(() => import("@/pages/incident-management/IncidentDetailPage"));
const IncidentProjectDetailPage = lazyWithRetry(() => import("@/pages/incident-management/IncidentProjectDetailPage"));
const IncidentAdminPage = lazyWithRetry(() => import("@/pages/incident-management/IncidentAdminPage"));
const IncidentSlaPage = lazyWithRetry(() => import("@/pages/incident-management/IncidentSlaPage"));
const IncidentExportPage = lazyWithRetry(() => import("@/pages/incident-management/IncidentExportPage"));
const IncidentAnalyticsPage = lazyWithRetry(() => import("@/pages/incident-management/IncidentAnalyticsPage"));
const ActiveJobsPage = lazyWithRetry(() => import("@/pages/incident-management/ActiveJobsPage"));
const AssetsPage = lazyWithRetry(() => import("@/pages/incident-management/AssetsPage"));
const AssetGroupsPage = lazyWithRetry(() => import("@/pages/incident-management/AssetGroupsPage"));
const AssetGroupDetailPage = lazyWithRetry(() => import("@/pages/incident-management/AssetGroupDetailPage"));
const IncidentCustomerManagementPage = lazyWithRetry(() => import("@/pages/incident-management/IncidentCustomerManagementPage"));
const PortalSettingsPage = lazyWithRetry(() => import("@/pages/incident-management/PortalSettingsPage"));

// Customer Portal pages
const CustomerForcePasswordChangePage = lazyWithRetry(() => import("@/pages/customer-portal/CustomerForcePasswordChangePage"));
const CustomerPortalAuthPage = lazyWithRetry(() => import("@/pages/customer-portal/CustomerPortalAuthPage"));
const CustomerServiceDashboard = lazyWithRetry(() => import("@/pages/customer-portal/CustomerServiceDashboard"));
const CustomerSubmitTicketPage = lazyWithRetry(() => import("@/pages/customer-portal/CustomerSubmitTicketPage"));
const CustomerInvitationPage = lazyWithRetry(() => import("@/pages/customer-portal/CustomerInvitationPage"));
const CustomerPortalSettingsPage = lazyWithRetry(() => import("@/pages/customer-portal/CustomerPortalSettingsPage"));
const CustomerMyTicketsPage = lazyWithRetry(() => import("@/pages/customer-portal/CustomerMyTicketsPage"));
const CustomerTicketDetailPage = lazyWithRetry(() => import("@/pages/customer-portal/CustomerTicketDetailPage"));
const CustomerTeamPage = lazyWithRetry(() => import("@/pages/customer-portal/CustomerTeamPage"));

// API Keys page
const ApiKeysPage = lazyWithRetry(() => import("@/pages/api-keys/ApiKeysPage"));

// CRM Pages (lazy-loaded with retry)
const ProspectsPage = lazyWithRetry(() => import("@/pages/crm/ProspectsPage"));
const AccountsPage = lazyWithRetry(() => import("@/pages/crm/AccountsPage"));
const ContactsPage = lazyWithRetry(() => import("@/pages/crm/ContactsPage"));
const DealsPage = lazyWithRetry(() => import("@/pages/crm/DealsPage"));
const PipelinePage = lazyWithRetry(() => import("@/pages/crm/PipelinePage"));
const ServicesPage = lazyWithRetry(() => import("@/pages/crm/ServicesPage"));
const ServiceDetailPage = lazyWithRetry(() => import("@/pages/crm/ServiceDetailPage"));
const CRMTasksPage = lazyWithRetry(() => import("@/pages/crm/TasksPage"));
const CRMAdminPage = lazyWithRetry(() => import("@/pages/crm/AdminPage"));
const CRMReportsPage = lazyWithRetry(() => import("@/pages/crm/ReportsPage"));
const CRMArchivePage = lazyWithRetry(() => import("@/pages/crm/CRMArchivePage"));
const MeetingsPage = lazyWithRetry(() => import("@/pages/crm/MeetingsPage"));

// Capacity Platform module pages (Phase 7 — lazy-loaded)
const CapacityPlatformLayout = lazyWithRetry(() => import("@/components/capacity-platform/CapacityPlatformLayout"));
const CapacityHubPage = lazyWithRetry(() => import("@/pages/timesheet/capacity-platform/CapacityHubPage"));
const CapacityPeoplePage = lazyWithRetry(() => import("@/pages/timesheet/capacity-platform/PeoplePage"));
const CapacityPersonDetailPage = lazyWithRetry(() => import("@/pages/timesheet/capacity-platform/PersonDetailPage"));
const CapacitySkillsPage = lazyWithRetry(() => import("@/pages/timesheet/capacity-platform/SkillsPage"));
const CapacityAllocationPage = lazyWithRetry(() => import("@/pages/timesheet/capacity-platform/AllocationPage"));
const CapacityWorkIntakePage = lazyWithRetry(() => import("@/pages/timesheet/capacity-platform/WorkIntakePage"));
const CapacityForecastPage = lazyWithRetry(() => import("@/pages/timesheet/capacity-platform/ForecastPage"));
const CapacityReportsPage = lazyWithRetry(() => import("@/pages/timesheet/capacity-platform/CapacityReportsPage"));
const CapacitySettingsPage = lazyWithRetry(() => import("@/pages/timesheet/capacity-platform/CapacitySettingsPage"));

// Create a stable QueryClient instance with mobile-first optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,           // 5 minutes
      gcTime: 1000 * 60 * 30,             // 30 minutes (mobile reconnect-friendly)
      refetchOnWindowFocus: false,        // Don't refetch on focus (saves mobile data)
      refetchOnReconnect: true,           // Refetch when connection restored
      retry: (failureCount, error: any) => {
        // Smarter retry logic for mobile
        if (error?.status === 404 || error?.status === 403) return false;
        return failureCount < 2; // Only retry twice to save mobile data
      },
      networkMode: 'offlineFirst',        // Work offline when possible
    },
    mutations: {
      networkMode: 'offlineFirst',
      // No automatic retry on mutations: most write paths (creating
      // incidents, expenses, deals, comments) are not idempotent, and a
      // network-timed-out request that already committed server-side
      // would be retried into a duplicate. Callers can explicitly opt
      // back in per-mutation when they know the operation is safe.
      retry: false,
    },
  },
});

const App = () => {
  // Preload critical routes after initial app load
  useEffect(() => {
    const timer = setTimeout(preloadCriticalRoutes, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <DeviceProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
            <Suspense fallback={<LayoutSkeleton variant="default" />}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/force-password-change" element={<ForcePasswordChangePage />} />
              {/* Customer Portal - All routes wrapped in CustomerAuthProvider */}
              <Route path="/customer-portal" element={
                <CustomerAuthProvider>
                  <CustomerPortalRedirect />
                </CustomerAuthProvider>
              } />
              <Route path="/customer-portal/auth" element={
                <CustomerAuthProvider>
                  <CustomerPortalAuthPage />
                </CustomerAuthProvider>
              } />
              <Route path="/customer-invitation" element={
                <CustomerAuthProvider>
                  <CustomerPortalRoute>
                    <CustomerInvitationPage />
                  </CustomerPortalRoute>
                </CustomerAuthProvider>
              } />
              <Route path="/customer-portal/*" element={
                <CustomerAuthProvider>
                  <CustomerPortalRoute>
                    <CustomerPortalLayout />
                  </CustomerPortalRoute>
                </CustomerAuthProvider>
              }>
                <Route path="dashboard" element={<CustomerServiceDashboard />} />
                <Route path="my-tickets" element={<CustomerMyTicketsPage />} />
                <Route path="my-tickets/:id" element={<CustomerTicketDetailPage />} />
                <Route path="submit-ticket" element={<CustomerSubmitTicketPage />} />
                <Route path="settings" element={<CustomerPortalSettingsPage />} />
                <Route path="team" element={<CustomerTeamPage />} />
                <Route path="force-password-change" element={<CustomerForcePasswordChangePage />} />
              </Route>

              {/* Management Hub - wrapped with force password check */}
              <Route element={<ForcePasswordChangeRoute />}>
              <Route path="/" element={<HubLayout />}>
                <Route index element={<ManagementHubPage />} />

                {/* Cost Calculator route (admin, manager, sale_manager access) */}
                <Route element={<CostCalculatorRoute />}>
                  <Route path="cost-calculator" element={<CostCalculatorPage />} />
                </Route>

                {/* Cost Calculator Settings (admin only) */}
                <Route element={<AdminRoute />}>
                  <Route path="cost-calculator/settings" element={<CostCalculatorSettingsPage />} />
                  <Route path="api-keys" element={<ApiKeysPage />} />
                </Route>
              </Route>
              </Route>

              {/* Incident Management */}
              <Route path="/incident-management" element={<AppErrorBoundary domain="Incident Management"><IncidentLayout /></AppErrorBoundary>}>
                {/* Routes accessible to ALL authenticated users */}
                <Route index element={<IncidentDashboardPage />} />
                <Route path="active-jobs" element={<ActiveJobsPage />} />
                <Route path="projects" element={<IncidentProjectsPage />} />
                <Route path="projects/:id" element={<IncidentProjectDetailPage />} />
                
                {/* Assets - accessible to everyone */}
                <Route path="assets" element={<AssetsPage />} />
                <Route path="assets/groups" element={<AssetGroupsPage />} />
                <Route path="assets/groups/:id" element={<AssetGroupDetailPage />} />
                
                {/* Portal Settings - accessible to everyone */}
                <Route path="portal-settings" element={<PortalSettingsPage />} />
                
                {/* Customer Account Management - accessible to all internal users */}
                <Route path="customers" element={<IncidentCustomerManagementPage />} />

                {/* Incident routes - accessible to all internal users (RLS enforces project-level access) */}
                <Route path="incidents" element={<IncidentListPage />} />
                <Route path="incidents/:id" element={<IncidentDetailPage />} />

                {/* Admin-only routes */}
                <Route element={<AdminRoute />}>
                  <Route path="admin" element={<IncidentAdminPage />} />
                  <Route path="sla" element={<IncidentSlaPage />} />
                  <Route path="analytics" element={<IncidentAnalyticsPage />} />
                  <Route path="export" element={<IncidentExportPage />} />
                </Route>
              </Route>

              {/* Timesheet Application */}
              <Route path="/timesheet" element={<AppErrorBoundary domain="Timesheet"><MainLayout /></AppErrorBoundary>}>
                <Route index element={<TimesheetPage />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="settings" element={<SettingsPage />} />

                {/* Permanent employee routes (full-time and part-time) */}
                <Route element={<PermanentEmployeeRoute />}>
                  <Route path="leave-application" element={<LeaveApplicationPage />} />
                </Route>

                {/* Authenticated user routes */}
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="work-location" element={<WorkLocationPage />} />

                {/* Manager-level routes (manager + admin access) */}
                <Route element={<ManagerRoute />}>
                  <Route path="contracts" element={<ContractsPage />} />
                </Route>

                {/* Admin-only routes protected by AdminRoute */}
                <Route element={<AdminRoute />}>
                  <Route path="ohs" element={<OHSPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="work-schedule" element={<WorkSchedulePage />} />
                  <Route path="holidays" element={<HolidayManagementPage />} />
                  <Route path="leave-management" element={<LeaveManagementPage />} />
                  <Route path="archive" element={<ArchivePage />} />
                </Route>
              </Route>

              {/* Capacity Platform — top-level app, manager+ only */}
              <Route path="/capacity-platform" element={<AppErrorBoundary domain="Capacity Platform"><CapacityAppLayout /></AppErrorBoundary>}>
                <Route element={<ManagerRoute />}>
                  <Route element={<CapacityPlatformLayout />}>
                    <Route index element={<CapacityHubPage />} />
                    <Route path="people" element={<CapacityPeoplePage />} />
                    <Route path="people/:id" element={<CapacityPersonDetailPage />} />
                    <Route path="skills" element={<CapacitySkillsPage />} />
                    <Route path="allocation" element={<CapacityAllocationPage />} />
                    <Route path="intake" element={<CapacityWorkIntakePage />} />
                    <Route path="forecast" element={<CapacityForecastPage />} />
                    <Route path="reports" element={<CapacityReportsPage />} />
                    <Route path="settings" element={<CapacitySettingsPage />} />
                  </Route>
                </Route>
              </Route>

              {/* CRM Application */}
              <Route path="/crm" element={<AppErrorBoundary domain="CRM"><CRMLayout /></AppErrorBoundary>}>
                <Route index element={<Navigate to="/crm/pipeline" replace />} />
                
                {/* Routes accessible to all CRM users including sale_user */}
                <Route path="pipeline" element={<PipelinePage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="tasks" element={<CRMTasksPage />} />
                <Route path="meetings" element={<MeetingsPage />} />
                
                {/* Deals accessible to all CRM users */}
                <Route path="deals" element={<DealsPage />} />
                <Route path="accounts" element={<AccountsPage />} />

                {/* Routes restricted from sale_user */}
                <Route element={<CRMSaleUserRestrictedRoute />}>
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="services/:id" element={<ServiceDetailPage />} />
                </Route>
                
                {/* Prospects — Admin only (Phase 1) */}
                <Route element={<CRMProspectsRoute />}>
                  <Route path="prospects" element={<ProspectsPage />} />
                </Route>

                {/* CRM Admin routes (Admin only) */}
                <Route element={<CRMAdminRoute />}>
                  <Route path="admin" element={<CRMAdminPage />} />
                </Route>
                
                {/* Archive - accessible to admin, sale_manager, sale_user with different permissions */}
                <Route path="archive" element={<CRMArchivePage />} />
                
                {/* CRM Reports routes (Admin only) */}
                <Route element={<CRMReportsRoute />}>
                  <Route path="reports" element={<CRMReportsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
        </DeviceProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
