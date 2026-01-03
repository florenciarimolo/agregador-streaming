# Application Logic - UpNext

This document describes the business logic, data rules, and architecture of the UpNext application.

## Table of Contents

1. [Title States](#title-states)
2. [Scoring System](#scoring-system)
3. [Recommendation Pool](#recommendation-pool)
4. [Data Model](#data-model)
5. [Business Rules](#business-rules)

---

## Title States

### Available States

A title can have **one active state** at a time:

- `watchlist`: Title saved to watch later
- `seen`: Title already watched by the user
- `not_interested`: Title that doesn't interest the user

### `liked` Attribute

**IMPORTANT: Product Decision - `liked`/`seen` Dependency**

`liked` is **NOT an independent state**. It is an **attribute** of the `seen` state.

#### Rules:

1. **`liked: true` can only exist when `status === 'seen'`**
   - Cannot have `liked: true` with `status: 'watchlist'` or `status: 'not_interested'`
   - `liked` cannot exist without `seen`

2. **When marking as "liked":**
   - Automatically sets `status: 'seen'` and `liked: true`
   - If the title was in `watchlist`, it is replaced by `seen`

3. **When removing `seen`:**
   - **Entire record** is deleted from `user_title_status`
   - This includes removing `liked: true` if it was present
   - **DO NOT attempt to maintain `liked` when removing `seen`**

4. **Current behavior is CORRECT and must be maintained**

This is a product decision to maintain data consistency and avoid orphaned states.

### State Transitions

```
┌─────────────┐
│  watchlist  │ ──┐
└─────────────┘   │
                  ├──> ┌──────┐
┌─────────────┐   │    │ seen │ ──> ┌──────────────┐
│not_interested│ ─┘    └──────┘     │ seen + liked │
└─────────────┘         │            └──────────────┘
                        │
                        └──> (remove) ──> [no state]
```

**Notes:**
- Changing from one state to another **replaces** the previous state
- `not_interested` removes any other state
- Marking as "liked" sets `seen` (and removes `watchlist` if it existed)
- Removing `seen` deletes the entire record (including `liked`)

---

## Scoring System

### Principle

The score represents **real affinity**, not future intention.

### Score Weights

Defined in `composables/database/constants.ts`:

```typescript
export const SCORE_WEIGHTS = {
  liked: 30,           // +30 points
  seen: -50,           // -50 points
  not_interested: -100, // -100 points
  watchlist: 0,        // 0 points (no effect)
};
```

### Application Rules

1. **Each signal is applied independently**
   - `liked` and `seen` are applied separately
   - If a title has `seen: true` and `liked: true`, both weights are applied

2. **All signals must be reversible**
   - When removing a state, its impact is exactly reversed
   - Reversal formula: `score -= SCORE_WEIGHTS[state]`

3. **`watchlist` never modifies the score**
   - Neither when adding nor removing
   - Weight = 0

### Calculation Examples

#### Scenario 1: Mark as "liked"
```
Initial state: no state (score = 0)
Action: liked = true, status = 'seen'
Result: score = +30 (liked) + (-50) (seen) = -20
```

#### Scenario 2: Mark as "seen" then "liked"
```
Initial state: status = 'watchlist' (score = 0)
Action 1: status = 'seen'
Result: score = -50

Action 2: liked = true (keeping seen)
Result: score = -50 + 30 = -20
```

#### Scenario 3: Remove "seen" (with liked)
```
Initial state: status = 'seen', liked = true (score = -20)
Action: remove seen
Result: 
  - Revert seen: score += 50 → score = 30
  - Revert liked: score -= 30 → score = 0
  - Delete entire record
```

#### Scenario 4: Mark as "not_interested"
```
Initial state: status = 'seen', liked = true (score = -20)
Action: status = 'not_interested'
Result:
  - Revert seen: score += 50 → score = 30
  - Revert liked: score -= 30 → score = 0
  - Apply not_interested: score -= 100 → score = -100
  - Remove from recommendation pool
```

---

## Recommendation Pool

### Concept

The recommendation pool is a persistent table (`recommendation_pool`) that stores candidate titles to recommend to the user, with their calculated scores.

### Structure

```sql
CREATE TABLE recommendation_pool (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'movie' or 'tv'
  source TEXT NOT NULL, -- 'based_on_like', 'trending', 'discover', 'easy', 'mood'
  score DOUBLE PRECISION,
  explanation_code TEXT,
  title_data JSONB,
  created_at TIMESTAMP,
  last_shown_at TIMESTAMP,
  UNIQUE(user_id, tmdb_id)
);
```

### Recommendation Sources

- `based_on_like`: Based on titles the user likes
- `trending`: Popular titles on TMDB
- `discover`: Discovery based on genres/preferences
- `easy`: Easy-to-watch content
- `mood`: Based on selected mood

### Score Update

The score is updated when the user:
- Marks a title as `liked`, `seen`, or `not_interested`
- Removes a state from a title

**Process:**
1. Get the previous state of the title
2. Revert the impact of the previous state (if applicable)
3. Apply the impact of the new state (if applicable)
4. If `not_interested`, remove from pool

### Pool Removal

A title is removed from the pool when:
- It is marked as `not_interested`
- The user has already watched it (`seen`)
- The pool is manually regenerated

---

## Data Model

### Table: `profiles`

Extends Supabase's `auth.users`. Stores user profile information.

**Main fields:**
- `id`: UUID (reference to `auth.users`)
- `email`: User email
- `display_name`: Display name
- `avatar_url`: Avatar URL
- `onboarding_completed`: Boolean indicating if onboarding was completed
- `settings`: JSONB with additional settings

### Table: `titles`

Stores movie and TV show information.

**Important characteristics:**
- `title`, `poster_path`, `overview` are **multi-language JSONB**
- Format: `{"es": "...", "ca": "...", "eu": "...", "gl": "...", "en": "..."}`
- `tmdb_id`: Unique TMDB ID (unique in the table)
- `type`: 'movie' or 'tv'

### Table: `user_title_status`

Stores title states for each user.

**Fields:**
- `user_id`: User UUID
- `tmdb_id`: Title ID in TMDB
- `type`: 'movie' or 'tv'
- `status`: 'watchlist', 'seen', or 'not_interested'
- `liked`: Boolean (can only be `true` when `status = 'seen'`)
- `created_at`: Creation timestamp

**Constraints:**
- `UNIQUE(user_id, tmdb_id)`: A user can only have one state per title
- `liked` only makes sense when `status = 'seen'`

### Table: `recommendation_pool`

Stores the recommendation pool for each user.

**Fields:**
- `user_id`: User UUID
- `tmdb_id`: Title ID
- `type`: 'movie' or 'tv'
- `source`: Recommendation origin
- `score`: Calculated score (can be negative)
- `explanation_code`: Code explaining why it's recommended
- `title_data`: JSONB with title data (cache)
- `last_shown_at`: Last time it was shown to the user

**Constraints:**
- `UNIQUE(user_id, tmdb_id)`: A title can only appear once in the pool

### Table: `user_preferences`

Stores user preferences.

**Main fields:**
- `favorite_genres`: Favorite genres
- `preferred_language`: Preferred language (ISO/TMDB format: 'es-ES', 'ca-ES', etc.)
- `included_providers`: Included streaming providers
- `region`: User region
- `exploration_mode`: Exploration mode
- `prioritize_content`: Prioritized content type

---

## Business Rules

### 1. Onboarding

- Users must complete onboarding before accessing recommendations
- During onboarding, they select up to 10 titles they like
- These titles are saved as `status: 'seen'` and `liked: true`

### 2. "Liked" Limit

- Maximum 10 titles marked as "liked"
- This limit is applied at the application level (not in the database)

### 3. Title Creation

- When adding a title to `watchlist`, `seen`, or `not_interested`, it is verified that the title exists in the `titles` table
- If it doesn't exist, it is automatically fetched from TMDB and created in the database
- This ensures titles are available when querying lists (watchlist, seen, etc.)

### 4. Multi-language

- Titles are stored in multiple languages (es, ca, eu, gl, en)
- They are fetched from TMDB according to user preferences
- The system automatically detects the alphabet (Latin, Cyrillic, etc.) to display correctly

### 5. Pool Regeneration

- The pool is automatically regenerated when:
  - The user marks titles as "liked"
  - The user removes titles from "liked"
  - The user changes their preferences
- It can also be manually regenerated

### 6. Security (RLS)

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- `titles` tables are public (read) as they contain TMDB data

---

## Main Flows

### Flow: Add to Watchlist

1. User clicks "Watch later"
2. Frontend calls `POST /api/users/title-status` with `status: 'watchlist'`
3. Backend verifies the title exists in `titles` (if not, fetches it from TMDB)
4. Backend does `upsert` in `user_title_status` with `status: 'watchlist'`, `liked: false`
5. Score is not modified (watchlist = 0)
6. Frontend shows success toast

### Flow: Mark as "Liked"

1. User clicks "Like"
2. Frontend calls `POST /api/users/title-status` with `status: 'seen'`, `liked: true`
3. Backend gets previous state
4. Backend reverts impact of previous state (if applicable)
5. Backend applies impact of `seen` (-50) and `liked` (+30)
6. Backend does `upsert` in `user_title_status`
7. Backend regenerates recommendation pool in background
8. Frontend shows success toast

### Flow: Remove from "Seen"

1. User clicks "Remove" from the watched list
2. Frontend calls `DELETE /api/users/title-status?tmdb_id=X`
3. Backend gets previous state (including `liked`)
4. Backend reverts impact of previous state:
   - If it had `seen`: reverts -50
   - If it had `liked`: reverts +30
5. Backend **deletes entire record** (including `liked` if it existed)
6. Frontend updates UI

### Flow: Mark as "Not Interested"

1. User clicks "Not interested"
2. Frontend calls `POST /api/users/title-status` with `status: 'not_interested'`
3. Backend gets previous state
4. Backend reverts impact of previous state (if applicable)
5. Backend applies impact of `not_interested` (-100)
6. Backend removes title from recommendation pool
7. Backend does `upsert` in `user_title_status`
8. Frontend shows toast with "Undo" option

---

## Implementation Notes

### API Endpoints

- `POST /api/users/title-status`: Create or update title state
- `DELETE /api/users/title-status`: Delete title state
- `GET /api/users/watchlist`: Get user watchlist
- `GET /api/recommendations`: Get recommendations from pool
- `POST /api/recommendations/populate-pool`: Regenerate pool

### Composable Functions

- `useUndoToast()`: Toast handling with undo option
- `getUserLikedTitle()`: Get if a title is marked as liked
- `upsertUserTitleStatus()`: Create or update title state
- `deleteUserTitleStatus()`: Delete title state

### Constants

Defined in `composables/database/constants.ts`:
- `TABLES`: Table names
- `SCORE_WEIGHTS`: Scoring weights
- `*_FIELDS`: Field names for each table

---

## References

- `types/TitleStatus.ts`: State definitions
- `composables/database/constants.ts`: Constants and weights
- `server/api/users/title-status.post.ts`: Update logic
- `server/api/users/title-status.delete.ts`: Delete logic
- `supabase/schema.sql`: Database schema
