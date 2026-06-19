import { format, formatDistanceToNow } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

/**
 * Australian Localization Utilities for CRM
 * - Currency: AUD
 * - Dates: dd/MM/yyyy
 * - Timezone: Australia/Melbourne (AEST/AEDT)
 */

const TIMEZONE = "Australia/Melbourne";

/**
 * Format amount as Australian dollars
 */
export const formatAUD = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Alias for formatAUD (for convenience)
 */
export const formatCurrency = formatAUD;

/**
 * Format date as dd/MM/yyyy
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy");
};

/**
 * Format date and time in Australia/Melbourne timezone
 */
export const formatDateTime = (
  date: Date | string | null | undefined
): string => {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy h:mm a");
};

/**
 * Format time only in Australia/Melbourne timezone
 */
export const formatTime = (date: Date | string | null | undefined): string => {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, TIMEZONE, "h:mm a");
};

/**
 * Format relative time (e.g., "2 hours ago") with AEST/AEDT awareness
 */
export const formatRelativeTime = (
  date: Date | string | null | undefined
): string => {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  const zonedDate = toZonedTime(d, TIMEZONE);
  return formatDistanceToNow(zonedDate, { addSuffix: true });
};

/**
 * Get current date/time in Australia/Melbourne timezone
 */
export const getCurrentMelbourneTime = (): Date => {
  return toZonedTime(new Date(), TIMEZONE);
};

/**
 * Format percentage
 */
export const formatPercentage = (
  value: number | null | undefined
): string => {
  if (value === null || value === undefined) return "N/A";
  return `${value}%`;
};

/**
 * Format phone number (Australian format)
 * Handles mobile (04XX XXX XXX) and landline (0X XXXX XXXX)
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return "N/A";
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "");
  
  // Mobile (10 digits starting with 04)
  if (cleaned.length === 10 && cleaned.startsWith("04")) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  // Landline (10 digits)
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }
  
  // Return as-is if doesn't match expected format
  return phone;
};

/**
 * Format ABN (Australian Business Number)
 * Format: XX XXX XXX XXX
 */
export const formatABN = (abn: string | null | undefined): string => {
  if (!abn) return "N/A";
  
  // Remove all non-digits
  const cleaned = abn.replace(/\D/g, "");
  
  // ABN should be 11 digits
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  
  // Return as-is if doesn't match expected format
  return abn;
};

/**
 * Parse dd/MM/yyyy string to Date object
 */
export const parseAustralianDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
};
