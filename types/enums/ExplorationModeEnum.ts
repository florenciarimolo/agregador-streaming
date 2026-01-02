export const ExplorationModeEnum = {
  similar: 'similar',
  balanced: 'balanced',
  surprise: 'surprise',
} as const;

export type ExplorationModeEnum =
  (typeof ExplorationModeEnum)[keyof typeof ExplorationModeEnum];

