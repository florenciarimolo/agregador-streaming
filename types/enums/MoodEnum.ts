export const MoodEnum = {
  RELAX: 'relax',
  LIGERO: 'ligero',
  INTENSO: 'intenso',
  EMOCIONAL: 'emocional',
  REFLEXIVO: 'reflexivo',
} as const;

export type MoodEnum = (typeof MoodEnum)[keyof typeof MoodEnum];
