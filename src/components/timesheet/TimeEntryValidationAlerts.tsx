/**
 * TimeEntryValidationAlerts Component
 *
 * Displays validation alerts for time entries with priority ordering:
 * 1. Working days validation (non-working days)
 * 2. Weekend entry warnings
 * 3. Holiday entry warnings
 * 4. Budget exceeded warnings
 *
 * Maintains exact visual layout from original TimeEntryDialog
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { BudgetValidation } from '@/types/validation.types';

export interface TimeEntryValidationAlertsProps {
  /** Whether this is a new entry (vs editing existing) */
  isNewEntry: boolean;

  /** Whether user can add entries to this date */
  canAddToThisDate: boolean;

  /** Weekend validation warning message */
  weekendWarning: string | null;

  /** Holiday validation warning message */
  holidayWarning: string | null;

  /** Budget validation result */
  budgetValidation: BudgetValidation | null;

  /** Whether user is admin (can override budget warnings) */
  isAdmin: boolean;

  /** Whether this is in admin editing mode */
  isAdminEditing: boolean;

  /** Whether to show weekend warning (not already approved) */
  showWeekendWarning: boolean;

  /** Whether to show holiday warning */
  showHolidayWarning: boolean;
}

export function TimeEntryValidationAlerts({
  isNewEntry,
  canAddToThisDate,
  weekendWarning,
  holidayWarning,
  budgetValidation,
  isAdmin,
  isAdminEditing,
  showWeekendWarning,
  showHolidayWarning,
}: TimeEntryValidationAlertsProps) {
  // Priority 1: Working days validation (blocks submission)
  if (isNewEntry && !canAddToThisDate) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Cannot Add Time Entry</AlertTitle>
        <AlertDescription>
          You can only add time entries for working days within the current week. This date is
          outside your working schedule.
        </AlertDescription>
      </Alert>
    );
  }

  // Priority 2: Weekend warning (requires approval for employees)
  if (isNewEntry && showWeekendWarning && weekendWarning) {
    return (
      <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">Weekend Entry</AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          {weekendWarning}
        </AlertDescription>
      </Alert>
    );
  }

  // Priority 3: Holiday warning (blocks submission)
  if (isNewEntry && showHolidayWarning && holidayWarning) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Holiday Entry Restricted</AlertTitle>
        <AlertDescription>{holidayWarning}</AlertDescription>
      </Alert>
    );
  }

  // Priority 4: Budget warnings
  if (budgetValidation && !budgetValidation.valid) {
    // Critical budget error (blocks submission for employees)
    if (budgetValidation.severity === 'error' && !isAdmin) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Budget Exceeded</AlertTitle>
          <AlertDescription>{budgetValidation.message}</AlertDescription>
        </Alert>
      );
    }

    // Warning for admins (can override) or near budget
    if (budgetValidation.severity === 'warning' || (budgetValidation.severity === 'error' && isAdmin)) {
      return (
        <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            {isAdmin ? 'Budget Exceeded (Admin Override Available)' : 'Budget Warning'}
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            {budgetValidation.message}
            {isAdmin && budgetValidation.severity === 'error' && (
              <span className="block mt-1 font-medium">
                As an admin, you can override this restriction.
              </span>
            )}
          </AlertDescription>
        </Alert>
      );
    }
  }

  // Admin editing mode indicator
  if (isAdminEditing) {
    return (
      <Alert variant="default" className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">Admin Editing Mode</AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          You are editing another user's time entry as an administrator.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
