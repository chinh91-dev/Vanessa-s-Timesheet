import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { canAccessProspects } from "@/lib/crm/permissions";
import { toast } from "@/hooks/use-toast";
import { getUserRole } from "@/utils/roles";

const CRMProspectsRoute = () => {
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
        const accessGranted = canAccessProspects(userRole);
        setHasAccess(accessGranted);
        setHasChecked(true);

        if (!accessGranted && location.pathname !== "/crm") {
          toast({
            title: "Access denied",
            description: "You do not have permission to access Prospects",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error checking Prospects access:", error);
        setHasAccess(false);
        setHasChecked(true);
      }
    };

    checkAccess();
  }, [user, loading, location.pathname]);

  if (loading || !hasChecked) return null;

  if (!hasAccess) return <Navigate to="/crm" replace />;

  return <Outlet />;
};

export default CRMProspectsRoute;
