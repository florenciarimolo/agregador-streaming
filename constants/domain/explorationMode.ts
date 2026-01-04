/**
 * Exploration mode values for recommendations
 * Domain constants for recommendation exploration strategies
 */

export const EXPLORATION_MODE = {
  SIMILAR: 'similar',
  BALANCED: 'balanced',
  SURPRISE: 'surprise',
} as const;

/**
 * Type for exploration mode values
 */
export type ExplorationMode = (typeof EXPLORATION_MODE)[keyof typeof EXPLORATION_MODE];

