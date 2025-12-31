export const AttentionEnum = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type AttentionEnum = (typeof AttentionEnum)[keyof typeof AttentionEnum];
