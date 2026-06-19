import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ForcePasswordChangeRoute() {
  const { user, mustChangePassword, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user must change password, redirect to force password change page
  if (user && mustChangePassword) {
    return <Navigate to="/force-password-change" replace />;
  }

  return <Outlet />;
}
