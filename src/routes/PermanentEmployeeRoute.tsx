import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEmploymentType } from "@/hooks/useEmploymentType";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Route wrapper for leave access
 * - All employment types can access
 * - Casual/Temporary employees are filtered to unpaid leave only at the form level
 */
const PermanentEmployeeRoute = () => {
  const { loading } = useAuth();
  const { employmentType } = useEmploymentType();

  // Show loading state while checking authentication and employment type
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  // If employment type is still null after loading, show error message
  if (employmentType === null) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              Unable to determine your employment type. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Allow all employment types through - filtering happens at form level
  return <Outlet />;
};

export default PermanentEmployeeRoute;
