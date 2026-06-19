import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useCustomerAuth } from '@/context/CustomerAuthContext';

export default function CustomerPortalRedirect() {
  const { user, loading } = useCustomerAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/customer-portal/dashboard" replace />;
  }

  // If not authenticated, redirect to login
  return <Navigate to="/customer-portal/auth" replace />;
}