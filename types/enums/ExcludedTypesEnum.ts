export const ExcludedTypesEnum = {
  reality: 'reality',
  anime: 'anime',
  documentary: 'documentary',
} as const;

export type ExcludedTypesEnum =
  (typeof ExcludedTypesEnum)[keyof typeof ExcludedTypesEnum];

