import { usesMMDDYYYYFormat } from '@/types/enums/DateFormatRegionEnum';

/**
 * Format a date string based on user's region
 * @param dateString Date string in YYYY-MM-DD format
 * @param region Optional user region code (e.g., 'US', 'ES')
 * @param t Translation function from useI18n() to translate "Not available"
 * @returns Formatted date string according to region format
 */
export function formatDateByRegion(
  dateString: string | null | undefined,
  region: string | null | undefined,
  t: (key: string) => string
): string {
  if (!dateString || dateString.trim() === '') {
    return t('media.notAvailable');
  }
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
