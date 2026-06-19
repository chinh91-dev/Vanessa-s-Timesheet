import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Route guard that restricts sale_user from accessing certain CRM pages.
 * sale_user can only access: Pipeline, Leads, Tasks
 * Redirects to Pipeline if they try to access restricted pages.
 */
const CRMSaleUserRestrictedRoute = () => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user is sale_user, redirect to pipeline (they can't access this route)
  if (userRole === 'sale_user') {
    return <Navigate to="/crm/pipeline" replace />;
  }

  // Allow access for all other CRM roles
  return <Outlet />;
};

export default CRMSaleUserRestrictedRoute;
