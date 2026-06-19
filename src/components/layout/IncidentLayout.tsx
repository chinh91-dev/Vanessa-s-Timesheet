
import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { IncidentSidebar } from "./IncidentSidebar";
import { Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";

const IncidentLayout = () => {
  const { session, userRole, loading } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Customer role users must use the customer portal, not internal pages
  if (userRole === 'customer') {
    return <Navigate to="/customer-portal" replace />;
  }

  return (
    <SidebarProvider>
      <div
        className="min-h-screen w-full theme-neural-glass relative overflow-x-hidden"
        style={{
          "--primary": "0 72.2% 50.6%", // Red 600
          "--ring": "0 72.2% 50.6%",
        } as React.CSSProperties}
      >
        <div className="neural-bg" />
        <div className="relative z-10 flex min-h-screen">
          <IncidentSidebar />

          <div className="flex-1 flex flex-col min-w-0">
            <Header />

            {/* Main content area */}
            <main className="flex-1 overflow-auto p-4 sm:p-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default IncidentLayout;