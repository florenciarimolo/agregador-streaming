/**
 * Regions that use MM/DD/YYYY format (month, day, year)
 * These regions follow the US date format convention
 */
export enum DateFormatRegionEnum {
  /** United States */
  US = 'US',
  /** Canada */
  CA = 'CA',
  /** Philippines */
  PH = 'PH',
  /** Micronesia */
  FM = 'FM',
  /** Marshall Islands */
  MH = 'MH',
  /** Palau */
  PW = 'PW',
}

/**
 * Check if a region code uses MM/DD/YYYY format
 * @param region Region code (e.g., 'US', 'ES')
 * @returns true if the region uses MM/DD/YYYY format
 */
export function usesMMDDYYYYFormat(region?: string | null): boolean {
  if (!region) return false;
  const regionUpper = region.toUpperCase();
  return Object.values(DateFormatRegionEnum).includes(
    regionUpper as DateFormatRegionEnum
  );
}

