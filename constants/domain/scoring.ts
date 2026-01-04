/**
 * Score weights for user title status changes
 * Official scoring logic: score represents real affinity, not future intention
 * 
 * Rules:
 * - Each signal is applied independently
 * - All signals must be reversible
 * - When removing a state, reverse exactly its impact: score -= SCORE_WEIGHTS[state]
 * - watchlist never modifies the score, neither when adding nor removing
 */
export const SCORE_WEIGHTS = {
  liked: 30,
  seen: -50,
  not_interested: -100,
  watchlist: 0,
} as const;

