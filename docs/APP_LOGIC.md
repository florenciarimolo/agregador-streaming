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

### Recommendation Filtering and Boosting

#### Minimum Quality Threshold

**IMPORTANT**: All recommendations must meet a minimum quality threshold:
- **Minimum vote average**: 6.5 (enforced during pool population)
- This ensures all recommendations in the pool are of acceptable quality
- The filtering system respects this threshold and never reduces scores below it

#### Mood and Attention Filtering System

The recommendation system uses **multiplicative boost factors** to reorder recommendations based on user's mood and attention level, while respecting the minimum quality threshold.

##### Boost Calculation

**Formula:**
```
finalScore = baseScore * Math.max(1 + combinedFactor, 0.4)
```

Where:
- `baseScore`: The original score from the recommendation pool (already filtered by 6.5 minimum)
- `combinedFactor`: Weighted combination of attention and mood factors
- `0.4`: Protection factor ensuring scores never drop below 40% of base (maintains quality)

**Factor Combination:**
```
combinedFactor = attentionFactor * 0.6 + moodFactor * 0.4
```

- **Attention weight**: 60% (higher priority)
- **Mood weight**: 40%

##### Boost Factors (Multiplicative)

Boost factors are expressed as percentages (e.g., `0.10` = +10%, `-0.15` = -15%):

**Attention Levels:**

- **LOW** (Baja atención):
  - +10%: Películas < 100 min, Series con 1 episodio
  - -15%: Thriller, Mystery, Sci-Fi (atenuado al 50% si voteAverage < 7.0)

- **MEDIUM** (Atención media):
  - +5%: Family, Comedy

- **HIGH** (Alta atención):
  - +10%: Drama, Thriller, Sci-Fi (atenuado al 50% si voteAverage < 7.0)
  - +15%: Mystery, Thriller (narrativas complejas)
  - -10%: Comedy, Animation (atenuado al 50% si voteAverage < 7.0)

**Mood Types:**

- **RELAX** (Relajado):
  - +10%: Comedy, Animation, Family
  - -10%: Thriller, Horror (atenuado al 50% si voteAverage < 7.0)
  - -10%: Drama denso < 7.0 (atenuado al 50%)

- **LIGERO** (Ligero):
  - +10%: Comedy
  - +5%: Adventure, Family
  - -5%: Drama pesado < 6.5 (atenuado al 50%)

- **INTENSO** (Intenso):
  - +10%: Thriller, Action, Crime
  - +5%: Votación alta (≥ 7.5)
  - -10%: Animación infantil < 7.0 (atenuado al 50%)

- **EMOCIONAL** (Emocional):
  - +10%: Drama, Romance
  - +5%: Drama (historias humanas)
  - -10%: Action vacía < 6.0 (atenuado al 50%)

- **REFLEXIVO** (Reflexivo):
  - +10%: Sci-Fi, Mystery
  - +5%: Documentary
  - -10%: Comedy simple < 6.5 (atenuado al 50%)

##### Attenuation Logic

Given that all titles already meet the 6.5 minimum threshold, boost factors are **attenuated** for lower-rated titles to avoid:
- Over-boosting mediocre titles
- Over-penalizing acceptable quality titles

**Attenuation rules:**
- If `voteAverage < 7.0`: Penalties and some boosts are reduced by 50%
- This ensures the system **reorders** rather than **expels** valid recommendations
- Maintains diversity even with extreme filter combinations

##### Content Type Filtering

- **Server-side filtering**: When `contentType !== 'all'`, the `type` parameter is sent to the server
- Filtering happens **before** calculating boosts, ensuring the candidate pool is appropriate
- Client-side filtering is only used when `contentType === 'all'` (for display purposes)

##### Benefits of Multiplicative System

1. **Proportional impact**: Boosts affect titles proportionally to their base score
2. **Quality preservation**: Protection factor (0.4) ensures no title drops below acceptable quality
3. **Natural ranking**: Higher-scored titles benefit more from positive boosts
4. **Stability**: System reorders rather than expels, maintaining list diversity
5. **Respects minimum threshold**: The 6.5 minimum is never violated

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

#### Scenario 4: Remove "liked" (keeping "seen")
```
Initial state: status = 'seen', liked = true (score = -20)
Action: liked = false (keeping seen)
Result:
  - Revert liked: score -= 30 → score = -50
  - Title remains as 'seen' (not eligible for recommendations)
  - Title does NOT return to recommendations
  - Pool is NOT regenerated (only score is adjusted)
```

#### Scenario 5: Mark as "not_interested"
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

**IMPORTANT: Pool vs Score Separation**

The system clearly separates:
- **Pool**: The universe of possible titles (defines what content is available)
- **Score**: Priority/relevance within that universe (defines ranking)

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

### Pool Regeneration

**IMPORTANT: Pool regeneration only occurs when structural preferences change**

The pool should **only** be regenerated when the user's structural preferences change, as these define the universe of available content.

#### Changes that trigger pool regeneration:

- **Region** (`region`)
- **Favorite genres** (`favorite_genres`)
- **Included providers** (`included_providers`)

#### Changes that update pool without regeneration:

- **App language** (`language` in user settings): When the app language changes, the system updates the `title_data` field in all pool entries with the title and overview in the new language. This is done by:
  1. First checking the `titles` table for existing title data in the new language
  2. If missing, fetching from TMDB
  3. Updating the `title_data` JSONB field in the pool entry
  4. The pool entries themselves (scores, sources, etc.) remain unchanged

**Note:** When the pool is regenerated, the system first checks the `titles` table for existing title data, and only fetches from TMDB if the information is missing or incomplete in the requested language. This ensures efficient caching and reduces API calls.

When preferences change:
1. The previous pool is discarded
2. A new pool is generated
3. Rankings and diversity are recalculated

#### Changes that do NOT trigger pool regeneration:

- Marking/unmarking titles as `liked`
- Marking/unmarking titles as `seen`
- Marking/unmarking titles as `not_interested`
- Adding/removing titles from `watchlist`

These actions:
- Adjust the score (weight/relevance)
- Affect the order of titles
- Affect similar titles
- May exclude or rehabilitate titles
- **Do NOT invalidate the pool**

### Score Update

The score is updated when the user:
- Marks a title as `liked`, `seen`, or `not_interested`
- Removes a state from a title

**Process:**
1. Get the previous state of the title
2. Revert the impact of the previous state (if applicable)
3. Apply the impact of the new state (if applicable)
4. If `not_interested`, remove from pool (but don't regenerate pool)

**Key principle**: Changing the score does not invalidate the pool. Only changing structural preferences invalidates the pool.

### Pool Removal

A title is removed from the pool when:
- It is marked as `not_interested`
- The user has already watched it (`seen`)
- The pool is manually regenerated (when preferences change)

### Neutral Exploration Mode

**IMPORTANT: Product Decision - Content Type Balance**

When no filters are active (neither mood, attention level, nor content type), the algorithm enters a **neutral exploration mode** that guarantees a balanced mix of content types.

#### Rules:

1. **No filters active → 50/50 balance**
   - When `mood === undefined` AND `attention === undefined` AND `contentType === 'all'`
   - The algorithm ensures a 50% movies / 50% TV shows distribution
   - Results are interleaved to maintain balance throughout the list
   - The final result cannot be dominated by a single content type

2. **Any filter active → Relevance priority**
   - When `mood !== undefined` OR `attention !== undefined` OR `contentType !== 'all'`
   - The balance is **disabled**
   - Priority is given to relevance according to filters
   - The system can return any proportion (even 100% of one type)
   - This allows filters to work naturally without artificial constraints

3. **Content Type Filtering**
   - When `contentType !== 'all'`, filtering is done **on the server** before calculating boosts
   - This ensures the pool of candidates is appropriate before applying mood/attention filters
   - Client-side filtering is only used when `contentType === 'all'` (for display purposes)

#### Implementation:

- After sorting by score (with boosts applied), the algorithm checks if filters are active
- If no filters: separates movies and TV shows, then interleaves them
- If filters active: uses the sorted list directly (no balance applied)
- Content type filtering happens on server when `type` query param is provided

This ensures that:
- Users exploring without preferences see a diverse mix
- Users with specific preferences get results tailored to their filters
- The base ranking bias (if any) is corrected in neutral mode
- Server-side filtering reduces unnecessary processing

### Automatic Replacement System

**IMPORTANT: Product Decision - Always 20 Recommendations**

The recommendation list must always maintain exactly 20 visible recommendations. When a title is removed, it is automatically replaced with a new one.

#### Rules:

1. **Always 20 recommendations visible**
   - The list never reduces in size
   - When a title is removed, a replacement is fetched immediately
   - No page reloads or filter resets required

2. **Titles that disappear from recommendations:**
   - Titles marked as `seen` (with or without `liked`)
   - Titles marked as `not_interested`
   - Titles added to `watchlist` (also disappear from recommendations)

3. **Replacement logic - No filters active:**
   - **Mode**: Exploration mode
   - **Strategy**: Replace with same type to maintain 50/50 balance
   - If a movie is removed → replace with another movie
   - If a TV show is removed → replace with another TV show
   - This ensures the balance is maintained even after removals

4. **Replacement logic - Filters active:**
   - **Mode**: Intention mode
   - **Strategy**: Replace with next most relevant title that matches filters
   - Can be any type (movie or TV show)
   - Priority is relevance, not type balance

#### Implementation:

- When a title is removed via `handleTitleStatus` or `handleMarkLiked`:
  1. The title is removed from the UI immediately
  2. A request is sent to `/api/recommendations/replacement` with:
     - `excluded_tmdb_id`: The removed title's ID
     - `excluded_type`: The removed title's type (movie/tv)
     - `mood`: Current mood filter (if any)
     - `attention`: Current attention filter (if any)
  3. The replacement endpoint:
     - Excludes the removed title and all other excluded titles (seen, not_interested, watchlist)
     - Applies mood/attention boosts using multiplicative factors if filters are active
     - Returns a replacement title:
       - Same type if no filters (to maintain balance)
       - Most relevant if filters active (any type, respecting content type filter if set)
  4. The replacement is added to the list immediately

#### State Reversal and Recommendations:

When a title's state is reversed (e.g., removing `seen` or `not_interested`):
- The title becomes eligible for recommendations again
- It may appear in future recommendations
- The replacement system continues to work normally

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
- `included_providers`: Included streaming providers
- `region`: User region
- `exploration_mode`: Exploration mode
- `prioritize_content`: Prioritized content type

**Note:** Language is managed through cookies (`i18n_redirected` cookie from Nuxt i18n), NOT stored in the database. The app always uses the user's app language from cookies for TMDB API calls. Region is stored in `profiles.settings.region` in the database.

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
  - The user changes their structural preferences (language, region, genres, providers)
- It can also be manually regenerated

**IMPORTANT**: Marking/unmarking titles as "liked" does NOT regenerate the pool. Only the score is adjusted.

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
7. Backend updates score in recommendation pool (does NOT regenerate pool)
8. Frontend removes title from recommendations (if visible) and fetches replacement
9. Frontend shows success toast

**Note**: The pool is NOT regenerated. Only the score is adjusted, maintaining pool stability.

### Flow: Remove "Liked" (keeping "Seen")

1. User clicks "Remove from favorites" (title is already marked as "seen")
2. Frontend calls `POST /api/users/title-status` with `status: 'seen'`, `liked: false`
3. Backend gets previous state
4. Backend reverts impact of `liked`: score -= 30
5. Backend does `upsert` in `user_title_status` (keeps `status: 'seen'`, sets `liked: false`)
6. Backend updates score in recommendation pool (does NOT regenerate pool)
7. Frontend shows success toast

**Important behaviors:**
- Title remains as `seen` (not eligible for recommendations)
- Title does NOT return to recommendations
- Only the score is adjusted (pool remains stable)
- To make the title eligible again, user must explicitly remove "seen"

### Flow: Remove from "Seen"

1. User clicks "Remove" from the watched list
2. Frontend calls `DELETE /api/users/title-status?tmdb_id=X`
3. Backend gets previous state (including `liked`)
4. Backend reverts impact of previous state:
   - If it had `seen`: reverts -50
   - If it had `liked`: reverts +30
5. Backend **deletes entire record** (including `liked` if it existed)
6. Backend updates score in recommendation pool (does NOT regenerate pool)
7. Frontend updates UI

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

## Password Recovery Flow

### `auth:recovery` Flag Lifecycle

The `auth:recovery` flag is a localStorage flag used to track the password recovery flow and prevent false authentication states.

#### Flag Format

**New format (with timestamp):**
```json
{ "value": 1, "ts": 1234567890123 }
```

**Legacy format (backward compatible):**
```
"1"
```

The flag includes a timestamp to prevent indefinite persistence if the user abandons the recovery flow. Flags older than 24 hours are automatically considered invalid and removed.

#### Lifecycle

1. **Set**: When user requests password reset
   - Location: `composables/useAuth.ts` → `resetPassword()`
   - Format: `{ value: 1, ts: Date.now() }`

2. **Persists through**:
   - `auth/callback.vue`: Detects recovery flow and redirects to reset-password
   - `auth/reset-password.vue`: Validates recovery session and allows password change

3. **Cleared**: Only after manual login
   - Locations:
     - `components/AuthForm.vue` → After successful password login
     - `pages/index.vue` → `handleAuthSuccess()` after successful authentication
   - Condition: User has real session, store is populated, middleware can detect it

#### Why This Flow?

**Problem**: When Supabase processes a recovery link, it creates a temporary recovery session. After changing the password, this session becomes a regular session, but the middleware may not detect it correctly, causing "home without detected session" bugs.

**Solution**: Keep the flag until the user manually logs in with their new password. This ensures:
- The store is properly populated
- The middleware can detect the session
- No false authentication states occur

#### Important Rules

❌ **DO NOT** remove the flag in `auth/callback.vue`  
❌ **DO NOT** remove the flag immediately after changing password  
✅ **DO** remove the flag only after successful manual login  
✅ **DO** validate flag age (24 hours max) to prevent indefinite persistence

#### Flow Diagram

```
User requests password reset
  ↓
Flag set: { value: 1, ts: timestamp }
  ↓
User clicks recovery link → callback.vue
  ↓
Flag detected → redirect to reset-password.vue
  ↓
User changes password → signOut() → redirect to login
  ↓
Flag persists (NOT removed)
  ↓
User logs in manually → store updated
  ↓
Flag removed → normal navigation
```

---

## References

- `types/TitleStatus.ts`: State definitions
- `composables/database/constants.ts`: Constants and weights
- `server/api/users/title-status.post.ts`: Update logic
- `server/api/users/title-status.delete.ts`: Delete logic
- `supabase/schema.sql`: Database schema
- `composables/useAuth.ts`: Password recovery flag management
