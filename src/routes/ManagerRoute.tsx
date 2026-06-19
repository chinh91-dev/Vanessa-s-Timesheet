
import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isManagerOrAbove } from "@/utils/roles";
import { toast } from "@/hooks/use-toast";

const ManagerRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isManagerUser, setIsManagerUser] = useState<boolean | null>(null);
  const [hasCheckedManager, setHasCheckedManager] = useState(false);

  useEffect(() => {
    const checkManagerStatus = async () => {
      if (!user || loading) {
        setIsManagerUser(null);
        setHasCheckedManager(false);
        return;
      }

      try {
        const managerStatus = await isManagerOrAbove(user);
        setIsManagerUser(managerStatus);
        setHasCheckedManager(true);

        // Show access denied toast and redirect if not manager or admin
        if (!managerStatus && location.pathname !== "/timesheet") {
          toast({
            title: "Access denied",
            description: "Manager role or higher required",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error checking manager status:", error);
        setIsManagerUser(false);
        setHasCheckedManager(true);
      }
    };

    checkManagerStatus();
  }, [user, loading, location.pathname]);

  // Show loading state while checking authentication and manager status
  if (loading || !hasCheckedManager) {
    return null;
  }

  // Redirect non-manager users to timesheet
  if (!isManagerUser) {
    return <Navigate to="/timesheet" replace />;
  }

  // Render manager-level content
  return <Outlet />;
};

export default ManagerRoute;
