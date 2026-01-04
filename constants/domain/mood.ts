/**
 * Mood values for content filtering
 * Domain constants for user mood preferences
 */

export const MOOD = {
  RELAX: 'relax',
  LIGERO: 'ligero',
  INTENSO: 'intenso',
  EMOCIONAL: 'emocional',
  REFLEXIVO: 'reflexivo',
} as const;

/**
 * Type for mood values
 */
export type Mood = (typeof MOOD)[keyof typeof MOOD];
