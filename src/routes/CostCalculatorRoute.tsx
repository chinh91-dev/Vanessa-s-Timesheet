import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

const ALLOWED_ROLES = ['admin', 'manager', 'sale_manager', 'sale_user'];

const CostCalculatorRoute = () => {
  const { userRole, loading } = useAuth();
  const location = useLocation();

  // Wait for both loading to complete AND userRole to be populated
  if (loading || userRole === null) {
    return null;
  }

  const hasAccess = ALLOWED_ROLES.includes(userRole || '');

  if (!hasAccess) {
    if (location.pathname !== "/timesheet") {
      toast({
        title: "Access denied",
        description: "You don't have permission to access the Cost Calculator",
        variant: "destructive",
      });
    }
    return <Navigate to="/timesheet" replace />;
  }

  return <Outlet />;
};

export default CostCalculatorRoute;
