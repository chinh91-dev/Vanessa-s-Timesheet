import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { canAccessReports } from "@/lib/crm/permissions";
import { toast } from "@/hooks/use-toast";
import { getUserRole } from "@/utils/roles";

const CRMReportsRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || loading) {
        setHasAccess(null);
        setHasChecked(false);
        return;
      }

      try {
        const userRole = await getUserRole(user.id);
        const accessGranted = canAccessReports(userRole);
        setHasAccess(accessGranted);
        setHasChecked(true);

        // Show access denied toast if not authorized
        if (!accessGranted && location.pathname !== "/crm") {
          toast({
            title: "Access denied",
            description: "Admin role required to access reports",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error checking CRM reports access:", error);
        setHasAccess(false);
        setHasChecked(true);
      }
    };

    checkAccess();
  }, [user, loading, location.pathname]);

  // Show loading state while checking authentication and permissions
  if (loading || !hasChecked) {
    return null;
  }

  // Redirect unauthorized users to CRM dashboard
  if (!hasAccess) {
    return <Navigate to="/crm" replace />;
  }

  // Render protected content
  return <Outlet />;
};

export default CRMReportsRoute;
