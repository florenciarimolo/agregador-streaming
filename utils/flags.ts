/**
 * Utility functions for flag icons
 */

import { FlagCode } from '@/types/enums/FlagCode';

/**
 * Map flag codes to file names
 * @param flagCode - Flag code (e.g., 'ES', 'CAT', 'US')
 * @returns File name for the flag icon (e.g., 'es', 'cat', 'us')
 */
export function getFlagFileName(flagCode: string): string {
  const flagMap: Record<FlagCode, string> = {
    [FlagCode.ES]: 'es',
    [FlagCode.CAT]: 'cat',
    [FlagCode.GAL]: 'gal',
    [FlagCode.EUS]: 'eus',
    [FlagCode.US]: 'us',
    [FlagCode.GB]: 'gb',
  };

  // Check if flagCode is a valid FlagCode enum value
  if (Object.values(FlagCode).includes(flagCode as FlagCode)) {
    return flagMap[flagCode as FlagCode] || flagCode.toLowerCase();
  }

  // Fallback to lowercase if not a known flag code
  return flagCode.toLowerCase();
}

