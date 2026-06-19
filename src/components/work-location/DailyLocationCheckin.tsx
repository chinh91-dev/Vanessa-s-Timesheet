import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getDailyLocationStatus,
  createDailyCheckin,
  getLocationColor,
  getLocationDisplayName,
  type DailyLocationStatus,
} from "@/lib/daily-location-service";
import { MapPin, CheckCircle, Building2, Home, Briefcase } from "lucide-react";

const LOCATION_OPTIONS = [
  {
    value: "collins_square",
    label: "Collins Square",
    Icon: Building2,
    activeBg: "bg-purple-600 hover:bg-purple-700",
    outlineBorder: "border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950",
  },
  {
    value: "wfh",
    label: "WFH",
    Icon: Home,
    activeBg: "bg-green-600 hover:bg-green-700",
    outlineBorder: "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950",
  },
  {
    value: "client",
    label: "Client Site",
    Icon: Briefcase,
    activeBg: "bg-orange-500 hover:bg-orange-600",
    outlineBorder: "border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950",
  },
];

const DailyLocationCheckin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<DailyLocationStatus | null>(null);
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Australia/Melbourne",
  });

  useEffect(() => {
    if (user?.id) loadLocationStatus();
  }, [user?.id]);

  const loadLocationStatus = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [locationStatus, checkinResult] = await Promise.all([
        getDailyLocationStatus(user.id, today),
        supabase
          .from("daily_location_checkins")
          .select("id")
          .eq("user_id", user.id)
          .eq("check_in_date", today)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setStatus(locationStatus);
      setCheckinId(checkinResult.data?.id ?? null);
    } catch (error) {
      console.error("Error loading location status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = async (location: string) => {
    if (!user?.id || checking) return;

    if (status?.has_checked_in && status?.actual_location === location) {
      return; // already at this location, do nothing
    }

    setChecking(true);
    try {
      if (status?.has_checked_in && checkinId) {
        // Update existing check-in
        await supabase
          .from("daily_location_checkins")
          .update({
            actual_location: location,
            updated_at: new Date().toISOString(),
          })
          .eq("id", checkinId);
      } else {
        // Create new check-in
        await createDailyCheckin(
          user.id,
          today,
          location,
          status?.planned_location ?? undefined
        );
      }

      toast({
        title: "Location confirmed!",
        description: `Checked in at ${getLocationDisplayName(location)}`,
      });

      await loadLocationStatus();
    } catch (error) {
      console.error("Error setting location:", error);
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full lg:mr-3">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  const dateDisplay = new Date().toLocaleDateString("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="w-full lg:mr-3 shadow-md">
      <CardHeader className="text-center pb-3 px-4">
        <CardTitle className="flex items-center justify-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-primary" />
          {status?.has_checked_in ? "Checked In" : "Where are you today?"}
        </CardTitle>
        <CardDescription className="text-sm">{dateDisplay}</CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-5 space-y-4">
        {status?.has_checked_in ? (
          <>
            {/* Current location */}
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Badge
                  className={`${getLocationColor(
                    status.actual_location || ""
                  )} text-sm px-3 py-1`}
                >
                  {getLocationDisplayName(status.actual_location || "")}
                </Badge>
              </div>
              {status.check_in_time && (
                <p className="text-xs text-muted-foreground">
                  Checked in at{" "}
                  {new Date(status.check_in_time).toLocaleTimeString("en-AU", {
                    timeZone: "Australia/Melbourne",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>

            {/* Change location buttons */}
            <div>
              <p className="text-xs text-muted-foreground text-center mb-2">
                Not there? Change:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {LOCATION_OPTIONS.map(({ value, label, Icon, activeBg, outlineBorder }) => {
                  const isCurrent = status.actual_location === value;
                  return (
                    <Button
                      key={value}
                      onClick={() => handleLocationSelect(value)}
                      disabled={checking || isCurrent}
                      variant="outline"
                      className={`flex flex-col h-16 gap-1 text-xs border ${
                        isCurrent
                          ? `${activeBg} text-white border-transparent`
                          : outlineBorder
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Planned location hint */}
            {status?.planned_location && (
              <p className="text-xs text-center text-muted-foreground">
                Scheduled:{" "}
                <span className="font-medium">
                  {getLocationDisplayName(status.planned_location)}
                </span>
              </p>
            )}

            {/* 3 big location buttons */}
            <div className="grid grid-cols-1 gap-3">
              {LOCATION_OPTIONS.map(({ value, label, Icon, activeBg }) => (
                <Button
                  key={value}
                  onClick={() => handleLocationSelect(value)}
                  disabled={checking}
                  className={`h-16 text-base font-semibold text-white ${activeBg} flex items-center gap-3 justify-center`}
                >
                  {checking ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                  {label}
                </Button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyLocationCheckin;
