import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimesheetEntry, Project, saveTimesheetEntry } from "@/lib/timesheet-service";
import { Contract } from "@/lib/contract-service";
import { formatDate, getWeekStart, isWeekend } from "@/lib/date-utils";
import { toast } from "@/hooks/use-toast";
import { Calendar, AlertTriangle, AlertCircle } from "lucide-react";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useWorkingDaysValidation } from "@/hooks/useWorkingDaysValidation";
import { useDayValidation } from "@/hooks/useDayValidation";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import WeekendApprovalDialog from "./WeekendApprovalDialog";
import { validateProjectBudget } from "@/lib/timesheet/validation/budget-validation-service";
import { showBudgetSaveSuccess } from "@/lib/timesheet/budget-notification-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/useDebounce";

// Import the components we've created
import { timeEntryFormSchema, TimeEntryFormValues } from "./time-entry/schema";
import { EntryTypeSelector } from "./time-entry/EntryTypeSelector";
import { ProjectSelector } from "./time-entry/ProjectSelector";
import { ContractSelector } from "./time-entry/ContractSelector";
import { TimeInput } from "./time-entry/TimeInput";
import { TaskDetails } from "./time-entry/TaskDetails";

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  date: Date;
  projects: Project[];
  contracts?: Contract[];
  existingEntry?: TimesheetEntry;
  onSave: (entry?: TimesheetEntry) => void;
  entries: TimesheetEntry[];
}

interface BudgetValidation {
  isValid: boolean;
  message?: string;
  remainingHours: number;
  totalBudget: number;
  hoursUsed: number;
  isOverBudget: boolean;
  canOverride: boolean;
  usagePercentage: number;
  warningLevel: 'none' | 'approaching' | 'exceeded';
}

const TimeEntryDialog: React.FC<TimeEntryDialogProps> = ({
  open,
  onOpenChange,
  userId,
  date,
  projects,
  contracts = [],
  existingEntry,
  onSave,
  entries = [],
}) => {
  const { user, userRole } = useAuth();
  const isMobile = useIsMobile();
  const isAdminUser = userRole === 'admin';
  const [entryType, setEntryType] = useState<"project" | "contract">("project");
  const [weekendApprovalOpen, setWeekendApprovalOpen] = useState(false);
  const [budgetValidation, setBudgetValidation] = useState<BudgetValidation | null>(null);
  const [budgetChecking, setBudgetChecking] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine the target user ID - use the passed userId (could be different for admin editing)
  const targetUserId = userId;
  const isAdminEditingOther = isAdminUser && targetUserId !== user?.id;

  // Get working days validation - use the target user's ID for admin editing
  const weekStart = getWeekStart(date);
  const validation = useWorkingDaysValidation(targetUserId, entries, weekStart);

  // Use unified day validation hook for weekend and holiday checks
  const { validateDay, canCreateWeekendEntries, canCreateHolidayEntries, isAdmin } = useDayValidation(targetUserId);

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      entry_type: existingEntry?.entry_type || "project",
      project_id: existingEntry?.entry_type === "project" ? existingEntry.project_id : "",
      contract_id: existingEntry?.entry_type === "contract" ? existingEntry.contract_id : "",
      hours_logged: existingEntry?.hours_logged || 1,
      notes: existingEntry?.notes || "",
      jira_task_id: existingEntry?.jira_task_id || "",
      start_time: existingEntry?.start_time || "",
      end_time: existingEntry?.end_time || "",
      task_mode: existingEntry?.incident_id ? "incident" : "manual",
      incident_id: existingEntry?.incident_id || undefined,
    },
  });

  // Watch form values for real-time budget checking
  const watchedEntryType = form.watch("entry_type");
  const watchedProjectId = form.watch("project_id");
  const watchedHours = form.watch("hours_logged");

  // Debounce budget checking to reduce API calls
  const debouncedProjectId = useDebounce(watchedProjectId, 300);
  const debouncedHours = useDebounce(watchedHours, 300);

  useEffect(() => {
    setEntryType(watchedEntryType || "project");
  }, [watchedEntryType]);

  // Budget validation for save blocking - use target user for admin editing
  const checkBudget = useCallback(async () => {
    if (watchedEntryType !== "project" || !debouncedProjectId || !debouncedHours || debouncedHours <= 0) {
      setBudgetValidation(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    setBudgetChecking(true);

    try {
      const validation = await validateProjectBudget({
        projectId: debouncedProjectId,
        hoursToAdd: Number(debouncedHours),
        existingEntryId: existingEntry?.id,
        userId: targetUserId // Use target user for budget validation
      });

      setBudgetValidation(validation);

      // Set warning/blocking states based on warning level and user role
      if (validation.warningLevel === 'approaching' && !isAdminUser) {
        setShowBudgetWarning(true);
      } else {
        setShowBudgetWarning(false);
      }
    } catch (error) {
      console.error("Error checking budget:", error);
      setBudgetValidation({
        isValid: false,
        message: "Failed to check project budget",
        remainingHours: 0,
        totalBudget: 0,
        hoursUsed: 0,
        isOverBudget: true,
        canOverride: false,
        usagePercentage: 0,
        warningLevel: 'exceeded' as const
      });
      setShowBudgetWarning(false);
    } finally {
      setBudgetChecking(false);
      setIsValidating(false);
    }
  }, [watchedEntryType, debouncedProjectId, debouncedHours, existingEntry?.id, targetUserId, isAdminUser]);

  useEffect(() => {
    checkBudget();
  }, [checkBudget]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        entry_type: existingEntry?.entry_type || "project",
        project_id: existingEntry?.entry_type === "project" ? existingEntry.project_id : "",
        contract_id: existingEntry?.entry_type === "contract" ? existingEntry.contract_id : "",
        hours_logged: existingEntry?.hours_logged || 1,
        notes: existingEntry?.notes || "",
        jira_task_id: existingEntry?.jira_task_id || "",
        start_time: existingEntry?.start_time || "",
        end_time: existingEntry?.end_time || "",
        task_mode: existingEntry?.incident_id ? "incident" : "manual",
        incident_id: existingEntry?.incident_id || undefined,
      });
      setEntryType(existingEntry?.entry_type || "project");
      setBudgetValidation(null);
      setShowBudgetWarning(false);
      setIsValidating(false);
      setIsSubmitting(false);
    }
  }, [open, existingEntry, form]);

  // Validation checks
  const isNewEntry = !existingEntry;
  const isWeekendDate = isWeekend(date);

  // Check if existing entry references a now-archived/expired project or contract
  const isProjectArchived = !!existingEntry && entryType === 'project' &&
    !!existingEntry.project_id &&
    !projects.find(p => p.id === existingEntry.project_id);
  const isContractArchived = !!existingEntry && entryType === 'contract' &&
    !!existingEntry.contract_id &&
    !contracts.find(c => c.id === existingEntry.contract_id);
  
  // Working days validation
  const canAddToThisDate = validation.canAddToDate(date);
  const showWorkingDaysWarning = isNewEntry && !canAddToThisDate;

  // Unified day validation (weekend, holiday, leave)
  const [dayValidation, setDayValidation] = useState<{ isBlocked: boolean; blockReason: string | null; message?: string; details?: { holidayName?: string; leaveType?: string } }>({ isBlocked: false, blockReason: null });
  const [checkingDayValidation, setCheckingDayValidation] = useState(false);

  useEffect(() => {
    const checkDayStatus = async () => {
      if (!isNewEntry) return; // Only validate for new entries
      
      setCheckingDayValidation(true);
      try {
        const result = await validateDay(date);
        setDayValidation(result);
      } catch (error) {
        console.error("Error validating day:", error);
        setDayValidation({ isBlocked: false, blockReason: null }); // Fail open
      } finally {
        setCheckingDayValidation(false);
      }
    };

    checkDayStatus();
  }, [date, validateDay, isNewEntry]);

  const showWeekendWarning = dayValidation.blockReason === 'weekend' && isNewEntry;
  const showHolidayWarning = dayValidation.blockReason === 'holiday' && isNewEntry;
  const showLeaveWarning = dayValidation.blockReason === 'leave' && isNewEntry;

  // Budget validation - block employees/managers only when exceeded (not approaching)
  const isEmployeeBudgetBlocked = budgetValidation && 
                                   budgetValidation.warningLevel === 'exceeded' && 
                                   !isAdminUser;

  const handleSubmit = async (values: TimeEntryFormValues) => {
    // Priority validation order: working days first, then weekend, then holiday, then budget
    if (isNewEntry && !canAddToThisDate) {
      toast({
        title: "Cannot add entry",
        description: validation.getValidationMessage(),
        variant: "destructive",
      });
      return;
    }

    if (isNewEntry && showWeekendWarning) {
      setWeekendApprovalOpen(true);
      return;
    }

    if (isNewEntry && showLeaveWarning) {
      toast({
        title: "On Leave",
        description: dayValidation.message || "You have approved leave on this day.",
        variant: "destructive",
      });
      return;
    }

    if (isNewEntry && showHolidayWarning) {
      toast({
        title: "Holiday Entry Not Allowed",
        description: dayValidation.message || "Holiday entries are not permitted for this date.",
        variant: "destructive",
      });
      return;
    }

    // Block employees from exceeding budget
    if (isEmployeeBudgetBlocked) {
      toast({
        title: "Budget Exceeded",
        description: "This entry would exceed the project budget. Please contact your administrator.",
        variant: "destructive",
      });
      return;
    }

    // Prevent double submissions
    if (isSubmitting) {
      console.log("Submit already in progress, ignoring duplicate click");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create unified entry data
      const entryData: TimesheetEntry = {
        id: existingEntry?.id,
        entry_type: values.entry_type,
        project_id: values.entry_type === 'project' ? values.project_id : undefined,
        contract_id: values.entry_type === 'contract' ? values.contract_id : undefined,
        entry_date: formatDate(date),
        hours_logged: values.hours_logged,
        notes: values.notes || "",
        jira_task_id: values.jira_task_id || "",
        start_time: values.start_time || undefined,
        end_time: values.end_time || undefined,
        incident_id: values.task_mode === 'incident' ? values.incident_id : undefined,
        // For admin editing: use the target user_id
        user_id: targetUserId,
      };

      // Preserve related data from existing entry if available
      if (existingEntry) {
        if (existingEntry.project) {
          entryData.project = existingEntry.project;
        }
        if (existingEntry.contract) {
          entryData.contract = existingEntry.contract;
        }
        if (existingEntry.user) {
          entryData.user = existingEntry.user;
        }
      }
      
      console.log("Attempting to save entry:", entryData);
      const savedEntry = await saveTimesheetEntry(entryData);
      console.log("Entry saved successfully:", savedEntry);
      
      // Show success notification with budget info
      const selectedProject = projects.find((p: Project) => p.id === values.project_id);
      showBudgetSaveSuccess(!!existingEntry, budgetValidation || undefined, selectedProject?.name);
      
      onSave(savedEntry);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving entry:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save your entry.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setBudgetValidation(null);
    setShowBudgetWarning(false);
    setIsValidating(false);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const isSaveDisabled = showWorkingDaysWarning || 
                        showWeekendWarning || 
                        showHolidayWarning ||
                        showLeaveWarning ||
                        isEmployeeBudgetBlocked || 
                        isValidating || 
                        budgetChecking ||
                        checkingDayValidation ||
                        isSubmitting;

  const getSaveButtonText = () => {
    if (isSubmitting) return "Saving...";
    if (isValidating || budgetChecking || checkingDayValidation) return "Validating...";
    if (isEmployeeBudgetBlocked) return "Budget Exceeded";
    if (showHolidayWarning) return "Holiday Entry Blocked";
    if (showLeaveWarning) return "On Leave";
    return "Save";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`
          flex flex-col max-h-[95vh]
          ${isMobile 
            ? 'w-[95vw] max-w-[95vw] h-[95vh] p-3' 
            : 'dialog-responsive-xl'
          }
          2xl:max-w-[1000px] 2xl:grid 2xl:grid-cols-2 2xl:gap-6
          3xl:max-w-[1200px]
        `}>
          {/* Header - spans full width on ultra-wide */}
          <DialogHeader className={`
            flex-shrink-0 
            ${isMobile ? 'pb-3' : 'pb-4 lg:pb-6'}
            2xl:col-span-2
          `}>
            <DialogTitle className="text-fluid-xl lg:text-fluid-2xl">
              {isAdminEditingOther && (
                <span className="text-orange-600 text-sm font-normal mr-2">[ADMIN EDIT]</span>
              )}
              {existingEntry ? "Edit time entry" : "Add time"}
            </DialogTitle>
          </DialogHeader>
          
          {/* Left column on ultra-wide: Date info and alerts */}
          <div className={`
            flex-1 overflow-y-auto min-h-0 space-y-4 lg:space-y-6
            ${isMobile ? 'px-1' : 'px-2'}
            2xl:overflow-visible 2xl:space-y-4
          `}>
            {/* Date display */}
            <div className="flex items-center">
              <div className="bg-primary/10 p-2 rounded-full mr-3">
                <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
              </div>
              <span className="text-fluid-md lg:text-fluid-lg font-medium">
                {format(date, "EEE, MMM d, yyyy")}
              </span>
              {isWeekendDate && (
                <div className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                  Weekend
                </div>
              )}
              {dayValidation.details?.holidayName && (
                <div className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  {dayValidation.details.holidayName}
                </div>
              )}
            </div>

            {/* Admin edit indicator */}
            {isAdminEditingOther && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-fluid-sm">
                  You are editing another user's timesheet entry as an administrator.
                  Only projects and contracts assigned to this user are available.
                </AlertDescription>
              </Alert>
            )}

            {/* Archived project/contract warning */}
            {isProjectArchived && (
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <div className="font-medium text-fluid-sm text-orange-800 dark:text-orange-400">Project Closed or Archived</div>
                  <div className="text-fluid-xs text-orange-700 dark:text-orange-300">
                    The project for this entry has been closed or archived and is no longer available for new time logging.
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {isContractArchived && (
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <div className="font-medium text-fluid-sm text-orange-800 dark:text-orange-400">Contract Closed or Archived</div>
                  <div className="text-fluid-xs text-orange-700 dark:text-orange-300">
                    The contract for this entry has been closed or archived and is no longer available for new time logging.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Validation alerts - priority order */}
            {showWorkingDaysWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-fluid-sm">
                  {validation.getValidationMessage()}
                </AlertDescription>
              </Alert>
            )}

            {!showWorkingDaysWarning && showWeekendWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-fluid-sm">
                  Weekend entries are not allowed. Please contact your administrator for approval.
                </AlertDescription>
              </Alert>
            )}

            {!showWorkingDaysWarning && !showWeekendWarning && showHolidayWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-fluid-sm">
                  <div className="font-medium">Holiday Entry Blocked</div>
                  <div>{dayValidation.message}</div>
                </AlertDescription>
              </Alert>
            )}

            {!showWorkingDaysWarning && !showWeekendWarning && !showHolidayWarning && isEmployeeBudgetBlocked && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium text-fluid-sm">Budget Exceeded</div>
                  <div className="text-fluid-xs">
                    This project has exceeded its budget. You cannot log additional time. 
                    Please contact your administrator.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Budget warning for employees/managers (approaching budget) */}
            {!showWorkingDaysWarning && !showWeekendWarning && !showHolidayWarning && !isEmployeeBudgetBlocked && showBudgetWarning && (
              <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                <AlertDescription>
                  <div className="font-medium text-fluid-sm text-yellow-800 dark:text-yellow-400">Budget Limit Approaching</div>
                  <div className="text-fluid-xs text-yellow-700 dark:text-yellow-300">
                    This project is nearing its budget limit. Please contact your administrator if you need additional hours.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Admin budget info */}
            {!showWorkingDaysWarning && !showWeekendWarning && !isEmployeeBudgetBlocked && isAdminUser && budgetValidation && budgetValidation.totalBudget > 0 && (
              <div className="p-3 lg:p-4 bg-muted rounded-lg border">
                <div className="flex items-center justify-between text-fluid-sm">
                  <span className="text-muted-foreground">Project Budget:</span>
                  <span className="font-medium">
                    {budgetValidation.hoursUsed.toFixed(2)} / {budgetValidation.totalBudget.toFixed(2)} hours used
                    {budgetValidation.remainingHours > 0 && (
                      <span className="ml-2 text-muted-foreground hidden sm:inline">
                        ({budgetValidation.remainingHours.toFixed(2)}h remaining)
                      </span>
                    )}
                  </span>
                </div>
                {(budgetChecking || isValidating) && (
                  <div className="mt-2 text-fluid-xs text-muted-foreground">Validating budget...</div>
                )}
              </div>
            )}

            {/* Validation info for allowed entries */}
            {!showWorkingDaysWarning && !showWeekendWarning && validation.daysRemaining > 0 && isNewEntry && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription className="text-fluid-sm">
                  {validation.getValidationMessage()}
                </AlertDescription>
              </Alert>
            )}

            {/* Weekend allowed info for admins */}
            {isWeekendDate && canCreateWeekendEntries && isAdmin && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription className="text-fluid-sm">
                  Weekend entry allowed (Admin privilege).
                </AlertDescription>
              </Alert>
            )}

            {/* Holiday allowed info for admins */}
            {dayValidation.details?.holidayName && !dayValidation.isBlocked && isAdmin && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription className="text-fluid-sm">
                  Holiday entry allowed for {dayValidation.details.holidayName} (Admin privilege).
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right column on ultra-wide: Form content */}
          <div className={`
            flex-1 overflow-y-auto min-h-0
            ${isMobile ? 'px-1' : 'px-2'}
            2xl:overflow-visible
          `}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 lg:space-y-6">
                <EntryTypeSelector control={form.control} />
                
                {entryType === "project" ? (
                  <ProjectSelector control={form.control} projects={projects} />
                ) : (
                  <ContractSelector control={form.control} contracts={contracts} />
                )}
                
                <TimeInput control={form.control} />

                <TaskDetails 
                  control={form.control} 
                  setValue={form.setValue}
                  watch={form.watch}
                  projectId={entryType === "project" ? form.watch("project_id") : undefined}
                />
              </form>
            </Form>
          </div>

          {/* Footer - spans full width on ultra-wide */}
          <DialogFooter className={`
            flex-shrink-0 border-t
            ${isMobile ? 'pt-3 mt-3' : 'pt-4 lg:pt-6 mt-4 lg:mt-6'}
            2xl:col-span-2
          `}>
            <div className={`
              flex w-full gap-3 
              ${isMobile ? 'flex-col' : 'sm:justify-end'}
            `}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                className={isMobile ? 'w-full' : ''}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={form.handleSubmit(handleSubmit)}
                className={`
                  ${isMobile ? 'w-full' : 'px-8'} 
                  ${isEmployeeBudgetBlocked || showHolidayWarning ? 'bg-red-600 hover:bg-red-700' : ''}
                `}
                disabled={isSaveDisabled}
                variant={isEmployeeBudgetBlocked || showHolidayWarning ? "destructive" : "default"}
              >
                {getSaveButtonText()}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WeekendApprovalDialog
        open={weekendApprovalOpen}
        onOpenChange={setWeekendApprovalOpen}
        date={date}
      />
    </>
  );
};

export default TimeEntryDialog;
