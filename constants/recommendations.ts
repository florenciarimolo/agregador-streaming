/**
 * Recommendation System Constants
 * 
 * This file contains all constants related to recommendation filtering,
 * boosting, and scoring. Centralized for easy maintenance and tuning.
 */

/**
 * Weights for combining attention and mood boost factors
 * Attention has higher priority (60%) than mood (40%)
 */
export const BOOST_WEIGHTS = {
  ATTENTION: 0.6,
  MOOD: 0.4,
} as const;

/**
 * Protection factor for final score calculation
 * Ensures scores never drop below 40% of base score
 * Formula: finalScore = baseScore * Math.max(1 + combinedFactor, PROTECTION_FACTOR)
 */
export const PROTECTION_FACTOR = 0.4;

/**
 * Boost factors for attention levels
 * Expressed as percentages (e.g., 0.1 = +10%, -0.15 = -15%)
 */
export const ATTENTION_BOOSTS = {
  LOW: {
    SHORT_RUNTIME: 0.1, // +10% for movies < 100 min
    SINGLE_EPISODE: 0.1, // +10% for TV shows with 1 episode
    COMPLEX_GENRES_PENALTY: -0.15, // -15% for Thriller, Mystery, Sci-Fi
  },
  MEDIUM: {
    FAMILY_GENRES: 0.05, // +5% for Family, Comedy
  },
  HIGH: {
    COMPLEX_GENRES: 0.1, // +10% for Drama, Thriller, Sci-Fi
    COMPLEX_NARRATIVES: 0.15, // +15% for Mystery, Thriller
    TRIVIAL_CONTENT_PENALTY: -0.1, // -10% for Comedy, Animation
  },
} as const;

/**
 * Boost factors for mood types
 * Expressed as percentages (e.g., 0.1 = +10%, -0.15 = -15%)
 */
export const MOOD_BOOSTS = {
  RELAX: {
    COMEDY_ANIMATION: 0.1, // +10% for Comedy, Animation
    FAMILY: 0.1, // +10% for Family
    THRILLER_HORROR_PENALTY: -0.1, // -10% for Thriller, Horror
    DENSE_DRAMA_PENALTY: -0.1, // -10% for dense Drama < 7.0
  },
  LIGERO: {
    COMEDY: 0.1, // +10% for Comedy
    ADVENTURE_FAMILY: 0.05, // +5% for Adventure, Family
    HEAVY_DRAMA_PENALTY: -0.05, // -5% for heavy Drama < 6.5
  },
  INTENSO: {
    THRILLER_ACTION_CRIME: 0.1, // +10% for Thriller, Action, Crime
    HIGH_RATING: 0.05, // +5% for voteAverage >= 7.5
    CHILD_ANIMATION_PENALTY: -0.1, // -10% for child Animation < 7.0
  },
  EMOCIONAL: {
    DRAMA_ROMANCE: 0.1, // +10% for Drama, Romance
    HUMAN_STORIES: 0.05, // +5% for Drama (human stories)
    EMPTY_ACTION_PENALTY: -0.1, // -10% for empty Action < 6.0
  },
  REFLEXIVO: {
    SCI_FI_MYSTERY: 0.1, // +10% for Sci-Fi, Mystery
    DOCUMENTARY: 0.05, // +5% for Documentary
    SIMPLE_COMEDY_PENALTY: -0.1, // -10% for simple Comedy < 6.5
  },
} as const;

/**
 * Attenuation factor for lower-rated titles
 * Applied when voteAverage < ATTENUATION_THRESHOLD
 * Reduces boost/penalty impact by 50% to avoid over-boosting mediocre titles
 */
export const ATTENUATION = {
  FACTOR: 0.5, // 50% reduction
  THRESHOLD: 7.0, // Apply attenuation if voteAverage < 7.0
} as const;

/**
 * Rating thresholds for boost calculations
 */
export const RATING_THRESHOLDS = {
  HIGH_RATING: 7.5, // For high rating boost
  ATTENUATION: 7.0, // For attenuation logic
  DENSE_DRAMA: 7.0, // For dense drama penalty
  HEAVY_DRAMA: 6.5, // For heavy drama penalty
  EMPTY_ACTION: 6.0, // For empty action penalty
  SIMPLE_COMEDY: 6.5, // For simple comedy penalty
  CHILD_ANIMATION: 7.0, // For child animation penalty
} as const;

/**
 * Duration thresholds for attention-based boosts
 */
export const DURATION_THRESHOLDS = {
  SHORT_MOVIE_MINUTES: 100, // Movies < 100 min get boost for LOW attention
  SINGLE_EPISODE: 1, // TV shows with 1 episode get boost for LOW attention
} as const;

