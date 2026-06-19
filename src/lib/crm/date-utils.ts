/**
 * Date utilities for CRM
 */

/**
 * Add business days to a date (skips weekends)
 * @param date Starting date
 * @param days Number of business days to add
 * @returns New date with business days added
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  
  return result;
}

/**
 * Add calendar days to a date
 * @param date Starting date
 * @param days Number of days to add
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date as YYYY-MM-DD for database storage.
 * Uses local time (en-CA produces YYYY-MM-DD without timezone shift),
 * because callers pass Dates built from local-midnight pickers and we
 * must persist the same calendar day, not the UTC equivalent.
 */
export function formatDateForDB(date: Date): string {
  return date.toLocaleDateString('en-CA');
}
