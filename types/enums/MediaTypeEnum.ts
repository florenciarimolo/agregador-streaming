export const MediaTypeEnum = {
  movie: 'movie',
  tv: 'tv',
} as const;

export type MediaTypeEnum = (typeof MediaTypeEnum)[keyof typeof MediaTypeEnum];