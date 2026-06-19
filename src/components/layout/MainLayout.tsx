import React, { Suspense } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider, useSidebarContext } from "@/context/SidebarContext";
import { WorkScheduleProvider } from "@/context/WorkScheduleContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { useDevice } from "@/context/DeviceContext";
import LayoutSkeleton from "@/components/common/LayoutSkeleton";
import ContentSkeleton from "@/components/common/ContentSkeleton";

const MainLayoutContent = () => {
  const { session, userRole, loading } = useAuth();
  const location = useLocation();
  const { isMobile } = useDevice();
  const { isCollapsed } = useSidebarContext();

  // Show skeleton while checking auth
  if (loading) {
    return <LayoutSkeleton variant="default" />;
  }

  // Save intended path before redirecting to auth (but not if already on auth page)
  if (!session && location.pathname !== '/auth') {
    console.log(`Saving intended path before redirect: ${location.pathname}`);
    localStorage.setItem('intended_path', location.pathname);
    return <Navigate to="/auth" replace />;
  }

  // If on auth page but authenticated, don't save the auth path
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect customer users to customer portal
  if (userRole === 'customer') {
    console.log('Customer user detected in MainLayout, redirecting to customer portal');
    return <Navigate to="/customer-portal" replace />;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden theme-neural-glass relative">
      <div className="neural-bg" />

      <div className="relative z-10 flex flex-col h-screen overflow-hidden">
        <Header />
        <div className="flex w-full flex-1 relative h-full overflow-hidden">
          {/* Dynamic sidebar with responsive behavior that retracts with content */}
          <div className={`
            hidden md:block
            ${isCollapsed ? 'w-[70px]' : 'w-64 lg:w-72'}
            border-r border-border h-full glass
            transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
            shrink-0 overflow-y-auto
            z-20
          `}>
            <Sidebar />
          </div>

          {/* Mobile sidebar overlay */}
          {isMobile && <Sidebar />}

          {/* Main content area with improved responsive width utilization */}
          <main className={`
          flex-1 min-w-0 w-full
          p-4 sm:p-6 md:p-8 lg:p-10
          overflow-x-hidden overflow-y-auto
          max-w-full
          bg-muted/30
          scroll-smooth
          ${isMobile ? 'pb-20' : ''}
        `}>
            <div className="w-full max-w-[1920px] mx-auto animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Suspense fallback={<ContentSkeleton />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>

        {/* Mobile bottom navigation */}
        {isMobile && <BottomNav suite="timesheet" />}
      </div>
    </div>
  );
};

export const MainLayout = () => {
  return (
    <SidebarProvider>
      <WorkScheduleProvider>
        <MainLayoutContent />
      </WorkScheduleProvider>
    </SidebarProvider>
  );
};

export default MainLayout;
