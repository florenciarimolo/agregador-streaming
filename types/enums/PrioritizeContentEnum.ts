export const PrioritizeContentEnum = {
  new: 'new',
  classics: 'classics',
  topRated: 'top_rated',
} as const;

export type PrioritizeContentEnum =
  (typeof PrioritizeContentEnum)[keyof typeof PrioritizeContentEnum];

