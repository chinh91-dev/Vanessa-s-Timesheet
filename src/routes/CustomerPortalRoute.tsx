import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '@/context/CustomerAuthContext';

interface CustomerPortalRouteProps {
  children: React.ReactNode;
}

export default function CustomerPortalRoute({ children }: CustomerPortalRouteProps) {
  const { user, loading, mustChangePassword } = useCustomerAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/customer-portal/auth" replace />;
  }

  // If user must change password, redirect to force password change page
  // But don't redirect if already on the force password change page
  if (mustChangePassword && location.pathname !== '/customer-portal/force-password-change') {
    return <Navigate to="/customer-portal/force-password-change" replace />;
  }

  return <>{children}</>;
}