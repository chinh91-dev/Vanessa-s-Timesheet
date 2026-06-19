// ============================================================================
// CapacityAppLayout — top-level shell for /capacity-platform/*
// ----------------------------------------------------------------------------
// Mirrors CRMLayout: Header on top, sidebar + main below. The in-app
// CapacitySidebar carries section navigation (Hub, People, Skills, etc.).
// Customer role is redirected out — capacity module is internal-only.
// ============================================================================

import { Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";
import CapacitySidebar from "@/components/capacity-platform/layout/CapacitySidebar";
import ContentSkeleton from "@/components/common/ContentSkeleton";

const CapacityAppLayoutContent = () => {
  const { session, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  if (userRole === "customer") {
    return <Navigate to="/customer-portal" replace />;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <div className="flex w-full h-[calc(100vh-56px)] sm:h-[calc(100vh-60px)]">
          <CapacitySidebar />
          <main className="flex-1 min-w-0 w-full overflow-x-hidden overflow-y-auto p-4 sm:p-6">
            <div className="w-full h-full animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Suspense fallback={<ContentSkeleton />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

const CapacityAppLayout = () => (
  <SidebarProvider>
    <CapacityAppLayoutContent />
  </SidebarProvider>
);

export default CapacityAppLayout;
