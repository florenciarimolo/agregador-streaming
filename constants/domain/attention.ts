/**
 * Attention level values for content filtering
 * Domain constants for user attention level preferences
 */

export const ATTENTION = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

/**
 * Type for attention level values
 */
export type Attention = (typeof ATTENTION)[keyof typeof ATTENTION];
