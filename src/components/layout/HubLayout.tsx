import React, { Suspense } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/layout/Header";
import LayoutSkeleton from "@/components/common/LayoutSkeleton";
import ContentSkeleton from "@/components/common/ContentSkeleton";

const HubLayout = () => {
  const { session, userRole, loading } = useAuth();
  const location = useLocation();

  // Show skeleton while checking auth
  if (loading) {
    return <LayoutSkeleton variant="hub" />;
  }

  // Redirect to auth if not authenticated
  if (!session) {
    console.log(`No session found, saving intended path: ${location.pathname}`);
    localStorage.setItem('intended_path', location.pathname);
    return <Navigate to="/auth" replace />;
  }

  // Redirect customer users to customer portal
  if (userRole === 'customer') {
    console.log('Customer user detected in HubLayout, redirecting to customer portal');
    return <Navigate to="/customer-portal" replace />;
  }

  return (
    <div className="min-h-screen w-full theme-neural-glass relative overflow-x-hidden">
      <div className="neural-bg" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <main className="w-full flex-1">
          <Suspense fallback={<ContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default HubLayout;
