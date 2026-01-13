/**
 * View mode values
 * Domain constants for view display modes
 */

export const VIEW_MODE = {
  MOSAIC: 'mosaic',
  LIST: 'list',
} as const;

/**
 * Type for view mode values
 */
export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

