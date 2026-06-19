
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lock, Unlock, Users, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateDisplay } from "@/lib/date-utils";
import {
  getGlobalLockStatus,
  lockTimesheetsGlobally,
  unlockTimesheetsGlobally,
  getUsersLockInfo,
  TimesheetLockStatus,
  UserLockInfo
} from "@/lib/timesheet-lock-service";

const TimesheetLockManager = () => {
  const [lockStatus, setLockStatus] = useState<TimesheetLockStatus>({
    totalUsersLocked: 0,
    earliestLockDate: null,
    latestLockDate: null,
    mostCommonReason: null
  });
  const [lockedUsers, setLockedUsers] = useState<UserLockInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lockUntilDate, setLockUntilDate] = useState("");
  const [lockReason, setLockReason] = useState("");

  const fetchLockData = async () => {
    try {
      setIsLoading(true);
      const [statusData, usersData] = await Promise.all([
        getGlobalLockStatus(),
        getUsersLockInfo()
      ]);
      setLockStatus(statusData);
      setLockedUsers(usersData);
    } catch (error) {
      console.error("Error fetching lock data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch lock status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLockData();
  }, []);

  const handleLockTimesheets = async () => {
    if (!lockUntilDate) {
      toast({
        title: "Date Required",
        description: "Please select a date to lock until",
        variant: "destructive"
      });
      return;
    }

    if (!lockReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for locking timesheets",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      await lockTimesheetsGlobally(lockUntilDate, lockReason);
      await fetchLockData();
      setLockUntilDate("");
      setLockReason("");
      toast({
        title: "Timesheets Locked",
        description: `All timesheets have been locked until ${formatDateDisplay(new Date(lockUntilDate))}`
      });
    } catch (error) {
      console.error("Error locking timesheets:", error);
      toast({
        title: "Error",
        description: "Failed to lock timesheets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockTimesheets = async () => {
    try {
      setIsLoading(true);
      await unlockTimesheetsGlobally();
      await fetchLockData();
      toast({
        title: "Timesheets Unlocked",
        description: "All timesheets have been unlocked"
      });
    } catch (error) {
      console.error("Error unlocking timesheets:", error);
      toast({
        title: "Error",
        description: "Failed to unlock timesheets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Lock Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Timesheet Lock Status
          </CardTitle>
          <CardDescription>
            Manage and monitor timesheet locks across all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Users Locked</p>
                <p className="text-2xl font-bold">{lockStatus.totalUsersLocked}</p>
              </div>
            </div>
            
            {lockStatus.earliestLockDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Earliest Lock</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateDisplay(new Date(lockStatus.earliestLockDate))}
                  </p>
                </div>
              </div>
            )}
            
            {lockStatus.latestLockDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Latest Lock</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateDisplay(new Date(lockStatus.latestLockDate))}
                  </p>
                </div>
              </div>
            )}
            
            {lockStatus.mostCommonReason && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Common Reason</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {lockStatus.mostCommonReason}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Lock Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Lock All Timesheets</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="lockDate">Lock until date</Label>
                  <Input
                    id="lockDate"
                    type="date"
                    value={lockUntilDate}
                    onChange={(e) => setLockUntilDate(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="lockReason">Reason for lock</Label>
                  <Textarea
                    id="lockReason"
                    placeholder="e.g., End of month processing, Audit in progress..."
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  onClick={handleLockTimesheets} 
                  disabled={isLoading}
                  className="w-full"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Lock All Timesheets
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Unlock All Timesheets</h4>
              <p className="text-sm text-muted-foreground">
                Remove all timesheet locks and allow editing for all users.
              </p>
              <Button 
                onClick={handleUnlockTimesheets} 
                variant="outline"
                disabled={isLoading || lockStatus.totalUsersLocked === 0}
                className="w-full"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Unlock All Timesheets
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locked Users Table */}
      {lockedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Locked Users</CardTitle>
            <CardDescription>
              Users whose timesheets are currently locked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Locked Until</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Locked By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockedUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.lockedUntilDate && (
                        <Badge variant="secondary">
                          {formatDateDisplay(new Date(user.lockedUntilDate))}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {user.lockReason || 'No reason provided'}
                    </TableCell>
                    <TableCell>{user.lockedByName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimesheetLockManager;
