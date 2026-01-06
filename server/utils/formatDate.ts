import { usesMMDDYYYYFormat } from '@/types/enums/DateFormatRegionEnum';

/**
 * Format a date string based on user's region
 * @param dateString Date string in YYYY-MM-DD format
 * @param region Optional user region code (e.g., 'US', 'ES')
 * @returns Formatted date string according to region format
 */
export function formatDateByRegion(
  dateString: string,
  region?: string | null
): string {
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString; // fallback por si el formato no es válido

  const [year, month, day] = parts;

  // If region uses MM/DD/YYYY format, return month/day/year
  if (usesMMDDYYYYFormat(region)) {
    return `${month}/${day}/${year}`;
  }

  // Default: DD-MM-YYYY format (day-month-year)
  return `${day}-${month}-${year}`;
}