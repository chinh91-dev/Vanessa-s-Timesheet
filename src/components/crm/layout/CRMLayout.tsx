import React, { useState, Suspense } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { useDevice } from "@/context/DeviceContext";
import { canAccessCRM } from "@/lib/crm/permissions";
import Header from "@/components/layout/Header";
import CRMSidebar from "./CRMSidebar";
import GlobalSearch from "./GlobalSearch";
import BottomNav from "@/components/layout/BottomNav";
import LayoutSkeleton from "@/components/common/LayoutSkeleton";
import ContentSkeleton from "@/components/common/ContentSkeleton";
import { useAccountRealtime } from "@/hooks/crm/useAccountRealtime";
import { useContactRealtime } from "@/hooks/crm/useContactRealtime";
import { useContactCategoryRealtime } from "@/hooks/crm/useContactCategoryRealtime";
import { useMeetingRealtime } from "@/hooks/crm/useMeetingRealtime";

const CRMLayoutContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { session, userRole, loading } = useAuth();
  const location = useLocation();
  const { isMobile } = useDevice();
  const [searchOpen, setSearchOpen] = useState(false);

  // Subscribe to real-time updates for accounts, contacts, categories, and meetings
  useAccountRealtime();
  useContactRealtime();
  useContactCategoryRealtime();
  useMeetingRealtime();

  // Redirect to auth if not authenticated
  if (!session) {
    console.log(`No session found, saving intended path: ${location.pathname}`);
    localStorage.setItem('intended_path', location.pathname);
    return <Navigate to="/auth" replace />;
  }

  // Show skeleton while loading auth
  if (loading || userRole === null) {
    return <LayoutSkeleton variant="crm" />;
  }

  // Redirect customer users to customer portal
  if (userRole === 'customer') {
    console.log('Customer user detected in CRMLayout, redirecting to customer portal');
    return <Navigate to="/customer-portal" replace />;
  }

  // Check if user has CRM access
  if (!canAccessCRM(userRole)) {
    console.log(`User role ${userRole} does not have CRM access, redirecting to timesheet`);
    return <Navigate to="/timesheet" replace />;
  }

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden theme-neural-glass relative"
      style={{
        "--primary": "271.5 81.3% 55.9%", // Purple 600
        "--ring": "271.5 81.3% 55.9%",
      } as React.CSSProperties}
    >
      <div className="neural-bg" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header>
          <GlobalSearch
            open={searchOpen}
            onOpenChange={setSearchOpen}
          />
        </Header>
        <div className="flex w-full h-[calc(100vh-56px)] sm:h-[calc(100vh-60px)]">
          {/* Sidebar - CRMSidebar handles responsive behavior internally */}
          <CRMSidebar />

          {/* Main content */}
          <main className={`
            flex-1 min-w-0 w-full
            overflow-x-hidden overflow-y-auto
            max-w-full
            ${isMobile ? 'pb-20' : ''}
          `}>
            <div className="w-full h-full animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Suspense fallback={<ContentSkeleton />}>
                {children || <Outlet />}
              </Suspense>
            </div>
          </main>
        </div>

        {/* Mobile bottom navigation */}
        {isMobile && <BottomNav suite="crm" />}
      </div>
    </div>
  );
};

export const CRMLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <SidebarProvider>
      <CRMLayoutContent>{children}</CRMLayoutContent>
    </SidebarProvider>
  );
};

export default CRMLayout;
