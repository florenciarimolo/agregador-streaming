# Application Logic - UpNext

This document describes the business logic, data rules, and architecture of the UpNext application.

## Table of Contents

1. [Architecture](#architecture)
2. [Component Rules](#component-rules)
3. [Constants Philosophy](#constants-philosophy)
4. [Title States](#title-states)
5. [Scoring System](#scoring-system)
6. [Recommendation Pool](#recommendation-pool)
7. [Recommendation Explanations](#recommendation-explanations)
8. [Data Model](#data-model)
9. [Business Rules](#business-rules)
10. [Technical Architecture](#technical-architecture)

---

## Architecture

### Principle

**Not every fetch should live in a service.**

The correct separation is:

- **Composables** → UI behavior and flows
- **Services** → Pure infrastructure
- **Pages / Components** → Visual rendering and orchestration

### When to use COMPOSABLES

Keep API calls within composables when:

- The call depends on reactive state (route, locale, store, UI)
- It's part of a flow (loading, skeleton, debounce, replacements, tracking)
- It reacts to user changes (filters, language, actions)

**Correct examples:**

- `useRecommendations` - depends on route, user, store, UI state
- `useTitleActions` - depends on recommendations, route, UI state
- `useRegions` - depends on i18n locale, reactive state

❌ **Do NOT move these calls to services.**

### When to use SERVICES

Create services only for infrastructure calls that:

- Do NOT depend on Vue or reactive state
- Are reused in multiple places
- Are pure CRUD or helpers

**Correct examples:**

- `services/auth.ts` - authentication operations
- `services/profiles.ts` - user profile CRUD
- `services/preferences.ts` - user preferences CRUD
- `services/titles.ts` - title database operations
- `services/userTitleStatus.ts` - title status CRUD

A service:

- ❌ Does NOT maintain state
- ❌ Does NOT have watchers
- ❌ Does NOT know about UI

### What NOT to do

- ❌ Don't create services that only wrap `$fetch`
- ❌ Don't pass 6 parameters to a service to compensate for lack of context
- ❌ Don't move fetches "for organization" if it loses clarity
- ❌ Don't duplicate logic between composables and services

### Goal

- Code easy to follow without jumping from file to file
- Each API call lives where it makes semantic sense
- Maintain flow clarity before abstraction
- If a refactor doesn't improve flow understanding, don't do it

---

## Component Rules

### Principle

**A component should only exist if it introduces a new responsibility:**

- Own behavior
- Internal state
- Real reusability
- Clear props/emits contract

### When to Create Components

Create components when they:

- ✅ Have their own behavior
- ✅ Manage internal state
- ✅ Are truly reusable
- ✅ Have a clear contract (props/emits)
- ✅ Encapsulate visual rules (layout primitives)
- ✅ Centralize design system rules

### When NOT to Create Components

Do NOT create components that:

- ❌ Are just wrappers without logic
- ❌ Only contain template markup
- ❌ Break the reading flow of the layout
- ❌ Don't improve UI comprehension
- ❌ Only exist to reduce lines or "organize" files
- ❌ Just group HTML or classes

### Layout Primitives

Layout components that centralize visual rules should be kept:

- `AppShell` - Defines shared width rules (`px-4 md:max-w-7xl md:mx-auto md:px-6`)
- `PageContainer` - Ensures full width consistency within AppShell
- `Section` - Centralizes spacing rules (`pt-6 pb-6 w-full space-y-4 md:space-y-8`)
- `SectionTitle` - Standardizes section heading styles

These components encapsulate visual rules and prevent duplication.

### Component Structure

```
/components
  /ui        → Reusable UI primitives with behavior/props
  /layout    → Layout structure components with visual rules
  /features  → Domain-specific feature components (if needed)
```

Avoid flat structures or extreme atomic design.

### Naming Conventions

- **PascalCase** always
- **Semantic names** (what it is, not how it looks)
- **Clear suffixes**: `Section`, `Card`, `Modal`, `Form`
- **Avoid generic names**: `Wrapper`, `Container`, `Content`

### Unification Criteria

When evaluating similar components:

- **Unify** if they share the same UI pattern and only differ in data/text
- **Keep separate** if they represent distinct domain concepts

Example: `FilterPill` unifies `GenrePill` and `ProviderPill` because they share the same UI pattern (pill with label, optional icon, remove action). The domain distinction (genre vs provider) belongs to the page/composable, not the component.

### Refactoring Rules

During code review, if a component:

- Doesn't meet these rules
- Has a non-semantic name
- Is a wrapper without responsibility
- Only exists due to unnecessary fragmentation

→ **Rename, merge, or delete it without hesitation.**

Don't keep components just for "historical respect."

### Goal

- Understand a page without jumping between files
- Component tree aligned with visual layout
- Fewer components, but better ones
- If extracting or maintaining a component doesn't improve readability, remove it

---

## Constants Philosophy

### Principle

**Constants exist only to:**

- Avoid errors
- Facilitate refactors
- Express domain

If they don't provide one of these values, they should not exist.

### When to use constants

Use constants for:

- Database table names
- Database column names
- Domain enums (status, types, etc.)
- Values shared between frontend and server
- Keys used in multiple places (query params, localStorage)

**Especially important in Supabase:**

- Do NOT hardcode table or column names in more than one place

### When NOT to use constants

- Strings used only once
- Obvious literals (`'POST'`, `true`, `1`)
- Constants created "for organization" without clear benefit

### Where to define them

Use a `/constants` folder structured by domain:

```
/constants
  /db
    tables.ts
    columns.ts
    errorCodes.ts
  /domain
    titleStatus.ts
    scoring.ts
  /api
    queryParams.ts
  /storage
    keys.ts
```

**Do NOT use a single giant `constants.ts` file.**

### Style rules

- Constants in **UPPERCASE**
- Use `as const`
- **Do NOT use TypeScript enums** (use const objects instead)
- Clear and semantic names

### Goal

- Code easy to refactor
- Fewer magic strings
- Better autocomplete and type safety
- Do not create constants that don't improve code understanding

### Current structure

**Database constants:**

- `/constants/db/tables.ts` - Table names (`TABLES`)
- `/constants/db/columns.ts` - Column names (`*_COLUMNS`)
- `/constants/db/errorCodes.ts` - Error codes (`POSTGREST_ERROR_CODES`, `POSTGRES_ERROR_CODES`)

**Domain constants:**

- `/constants/domain/titleStatus.ts` - Title status values (`TITLE_STATUS`)
- `/constants/domain/scoring.ts` - Score weights (`SCORE_WEIGHTS`)

**API constants:**

- `/constants/api/queryParams.ts` - Query parameter names (`QUERY_PARAMS`)

**Storage constants:**

- `/constants/storage/keys.ts` - localStorage keys (`STORAGE_KEYS`)

---

## Title States

### Available States

A title can have **one active state** at a time:

- `TITLE_STATUS.WATCHLIST`: Title saved to watch later
- `TITLE_STATUS.SEEN`: Title already watched by the user
- `TITLE_STATUS.NOT_INTERESTED`: Title that doesn't interest the user

**Constants:** Defined in `/constants/domain/titleStatus.ts` as `TITLE_STATUS` (replaces the old `TitleStatus` enum)

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

The score represents **real affinity**, not future intention. The system uses an **incremental scoring model** that separates base popularity from user preferences, allowing progressive adjustments without full pool regeneration.

### Incremental Scoring Model

The recommendation pool uses a multi-component scoring system:

#### Schema

```sql
CREATE TABLE recommendation_pool (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  score DOUBLE PRECISION, -- Persisted: base_score + preference_score
  base_score DOUBLE PRECISION, -- Initial score from popularity/quality (never changes after population)
  preference_score DOUBLE PRECISION, -- Score from likes/dislikes and similarity propagation
  explanation_code TEXT,
  created_at TIMESTAMP,
  last_shown_at TIMESTAMP, -- Used for recency_weight calculation
  UNIQUE(user_id, tmdb_id)
);
```

#### Score Components

1. **`base_score`**: Initial score based on popularity/rating, set during pool population
   - Normalized from `vote_average` (0-10) to score range (0-50)
   - Never changes after initial population
   - Represents inherent quality/popularity

2. **`preference_score`**: Score component derived from user interactions
   - Starts at 0
   - Updated incrementally via likes/dislikes
   - Propagates to similar titles (by shared genres)
   - Can be reduced via soft reset in extreme behavior scenarios

3. **`score` (persisted)**: Sum of `base_score` + `preference_score`
   - Used as base for runtime calculations
   - **NOT used for direct ordering** (see `final_score` below)

4. **`recency_weight`** (runtime): Decay factor based on `last_shown_at`
   - Exponential decay: `e^(-days_since_shown * decay_rate)`
   - Normalized to range 0.5 - 1.0
   - Calculated only at runtime, never persisted

5. **`animation_bias`** (runtime): Dynamic multiplier for animated content (0.7-1.0)
   - Reduces over-representation of animation without excluding it
   - Adjusts based on user affinity, explicit dislikes, adult animation detection
   - Calculated only at runtime, never persisted

#### Final Score Calculation

**IMPORTANT**: The persisted `score` is **NOT** the final ordering criterion.

The final ordering uses `final_score`, calculated at runtime:

```
final_score = (base_score * 0.4 + preference_score * 0.4 + recency_weight * 0.2) * animation_bias
```

After calculating `final_score`:
- Apply mood/attention boosts as runtime multiplicative adjustments
- Apply controlled randomization (±5%)
- **Order by `final_score` DESC** (NOT by `score`)

### User Interaction Scoring

#### LIKE Action

- Increment `preference_score` by base increment (e.g., +10)
- Propagate influence to similar titles (by shared genres):
  - ≥2 shared genres: +15 (strong influence)
  - 1 shared genre: +7 (moderate influence)
- Recalculate `score = base_score + preference_score`

#### REMOVE LIKE Action

- Apply soft decay: `preference_score *= 0.7`
- Propagate decay to similar titles
- Recalculate `score = base_score + preference_score`

#### DISLIKE Action

- Apply strong penalty to `preference_score` (e.g., -15)
- Propagate penalty to similar titles
- Remove from pool
- Recalculate `score = base_score + preference_score`

### Similarity Propagation

When a user likes/dislikes a title, the system propagates influence to similar titles based on shared genres:

- **Strong influence**: Titles with ≥2 shared genres receive 1.5x the base increment/penalty
- **Moderate influence**: Titles with 1 shared genre receive 0.7x the base increment/penalty
- This creates progressive, contextual adjustments without full pool regeneration

### Soft Reset

In extreme user behavior scenarios (e.g., removing >60% of likes in a short window), the system performs a **soft reset**:

- Reduces historical `preference_score` by decay factor (default: *0.5)
- Maintains `base_score` unchanged
- Does NOT clear the pool
- Allows the system to adapt to changing user preferences gradually

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

- **LOW** (Low attention):
  - +10%: Movies < 100 min, Series with 1 episode
  - -15%: Thriller, Mystery, Sci-Fi (attenuated by 50% if voteAverage < 7.0)

- **MEDIUM** (Medium attention):
  - +5%: Family, Comedy

- **HIGH** (High attention):
  - +10%: Drama, Thriller, Sci-Fi (attenuated by 50% if voteAverage < 7.0)
  - +15%: Mystery, Thriller (complex narratives)
  - -10%: Comedy, Animation (attenuated by 50% if voteAverage < 7.0)

**Mood Types:**

- **RELAXED**:
  - +10%: Comedy, Animation, Family
  - -10%: Thriller, Horror (attenuated by 50% if voteAverage < 7.0)
  - -10%: Dense drama < 7.0 (attenuated by 50%)

- **LIGHT**:
  - +10%: Comedy
  - +5%: Adventure, Family
  - -5%: Heavy drama < 6.5 (attenuated by 50%)

- **INTENSE**:
  - +10%: Thriller, Action, Crime
  - +5%: High rating (≥ 7.5)
  - -10%: Children's animation < 7.0 (attenuated by 50%)

- **EMOTIONAL**:
  - +10%: Drama, Romance
  - +5%: Drama (human stories)
  - -10%: Empty action < 6.0 (attenuated by 50%)

- **REFLECTIVE**:
  - +10%: Sci-Fi, Mystery
  - +5%: Documentary
  - -10%: Simple comedy < 6.5 (attenuated by 50%)

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
  score DOUBLE PRECISION, -- Persisted: base_score + preference_score
  base_score DOUBLE PRECISION, -- Initial score from popularity/quality
  preference_score DOUBLE PRECISION, -- Score from user interactions
  explanation_code TEXT,
  created_at TIMESTAMP,
  last_shown_at TIMESTAMP, -- Used for recency_weight calculation
  UNIQUE(user_id, tmdb_id)
);
```

**IMPORTANT**: The `titles` table stores multi-language metadata (title, overview, poster_path) as JSONB. The `recommendation_pool` does NOT store language data. Metadata is read from `titles` JSONB based on the current language at runtime.

### Recommendation Sources

- `based_on_like`: Based on titles the user likes
- `trending`: Popular titles on TMDB
- `discover`: Discovery based on genres/preferences
- `easy`: Easy-to-watch content
- `mood`: Based on selected mood

### Pool Regeneration

**IMPORTANT: Pool regeneration only occurs when the content universe changes**

The pool should **only** be regenerated when the user's **region** changes, as this defines a new universe of available content from TMDB.

#### Changes that trigger pool regeneration:

- **Region** (`region`): Changing region defines a new content universe
  - TMDB returns different universes per region (trending, discover, recommendations, provider availability)
  - Pool is completely regenerated with `clearPool=true`
  - All TMDB calls use the new region parameter

#### Changes that do NOT trigger pool regeneration:

- **App language** (`language`): Only affects metadata display
  - Reads from `titles` JSONB based on current language
  - If metadata is missing for the language, fetches from TMDB conditionally
  - Pool entries (scores, sources) remain unchanged

- **Favorite genres** (`favorite_genres`): Only used for runtime filtering
  - Saved to `user_preferences` but NOT used during pool population
  - Applied as filters in `recommendations/index.get.ts` at runtime
  - Changing genres does NOT regenerate the pool

- **Included providers** (`included_providers`): Only used for runtime filtering
  - Saved to `user_preferences` but NOT used during pool population
  - Applied as best-effort filters in `recommendations/index.get.ts` at runtime
  - If a title lacks provider data, it's included anyway (best-effort)
  - Changing providers does NOT regenerate the pool

- **Likes/dislikes**: Only update `preference_score` incrementally
  - Adjust scores and propagate to similar titles
  - Do NOT invalidate the pool

#### Multi-language Metadata

The `titles` table stores multi-language metadata as JSONB:

```sql
CREATE TABLE titles (
  tmdb_id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  title JSONB, -- { "en": "Title", "es": "Título", ... }
  overview JSONB, -- { "en": "Overview", "es": "Resumen", ... }
  poster_path JSONB, -- { "en": "/path.jpg", "es": "/path.jpg", ... }
  genres JSONB,
  ...
);
```

**Rules:**
- `populate-pool` and `refresh-pool` check if metadata exists in JSONB before fetching from TMDB
- Only fetches from TMDB if metadata is missing for the current language
- `recommendations/index.get.ts` and `replacement.get.ts` read from JSONB based on current language
- **Never** call TMDB from recommendation endpoints (only from populate/refresh)

#### Region vs Language

**Critical distinction:**

- **Region**: Defines the content universe → Regenerates pool
- **Language**: Only affects metadata display → Does NOT regenerate pool

This separation ensures:
- Pool stability when users change language
- Efficient metadata caching across languages
- Correct content universe per region

### Score Update

The `preference_score` is updated when the user:

- Marks a title as `liked` → Increment `preference_score`, propagate to similar titles
- Removes a like → Apply decay (`preference_score *= 0.7`), propagate decay
- Marks a title as `not_interested` → Apply penalty, propagate, remove from pool

**Process:**

1. Update `preference_score` based on action
2. Propagate influence to similar titles (by shared genres)
3. Recalculate `score = base_score + preference_score`
4. If `not_interested`, remove from pool (but don't regenerate pool)

**Key principle**: Changing `preference_score` does not invalidate the pool. Only changing region invalidates the pool.

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

4. **Replacement scoring:**
   - Uses existing ranking (`score = base_score + preference_score`) as base
   - Calculates `final_score` with `recency_weight` (NO `animation_bias` in replacement)
   - Applies mood/attention boosts as runtime multiplicative adjustments
   - Applies genre/provider filters (best-effort)
   - **Orders by `final_score` DESC** (NOT by `score`)
   - **Never persists changes** to database

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
     - Uses existing ranking (`score = base_score + preference_score`) as base
     - Calculates `final_score` with `recency_weight` (NO `animation_bias` in replacement)
     - Applies genre/provider filters (best-effort)
     - Applies mood/attention boosts as runtime multiplicative adjustments
     - **Orders by `final_score` DESC** (NOT by `score`)
     - **Never persists changes** to database
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

## Recommendation Explanations

The recommendation system can optionally explain _why_ a title is being shown to the user.

This explanation is informational only and does not affect ranking or behavior.

### explanation_code

Stored in `recommendation_pool.explanation_code`.

It represents a **human-readable reason** that can be displayed in the UI.

Allowed values:

- `BASED_ON_LIKE` – Based on titles the user liked
- `TRENDING` – Trending this week
- `DISCOVER` – Editorial discovery
- `EASY_TO_WATCH` – Easy-to-watch content
- `MOOD_MATCH` – Matches the user's current mood (calculated dynamically)

### Display Rules

- Displayed only in **personalized recommendations**
- Never displayed in Discover or editorial lists
- Rendered as subtle helper text, not as a badge
- Optional: if missing, nothing is shown

### Important Notes

- `source` is internal and must never be shown in the UI
- `MOOD_MATCH` is not persisted in the database; it is calculated at read time
- Explanations are meant to provide context, not transparency of the algorithm

---

## Data Model

### Table: `profiles`

Extends Supabase's `auth.users`. Stores user profile information.

**Fields:**

- `id`: UUID PRIMARY KEY (references `auth.users.id` ON DELETE CASCADE)
- `email`: TEXT - User email
- `display_name`: TEXT - Display name
- `avatar_url`: TEXT - Avatar URL
- `onboarding_completed`: BOOLEAN DEFAULT FALSE NOT NULL - Indicates if onboarding was completed
- `created_at`: TIMESTAMP WITH TIME ZONE - Creation timestamp (auto-set)
- `updated_at`: TIMESTAMP WITH TIME ZONE - Last update timestamp (auto-updated via trigger)

**Constraints:**

- Primary key references `auth.users(id)` with CASCADE delete
- Auto-created via trigger when a new user signs up

### Table: `titles`

Stores movie and TV show information.

**Fields:**

- `id`: UUID PRIMARY KEY - Internal ID (auto-generated)
- `tmdb_id`: INTEGER UNIQUE NOT NULL - TMDB ID for reference
- `title`: JSONB NOT NULL - Multi-language title in ISO format: `{"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}`
- `type`: TEXT NOT NULL CHECK (type IN ('movie', 'tv')) - Content type
- `poster_path`: JSONB - Multi-language poster path in ISO format (same structure as title)
- `backdrop_path`: TEXT - Backdrop image path
- `overview`: JSONB - Multi-language overview in ISO format (same structure as title)
- `release_date`: DATE - Release date for movies
- `first_air_date`: DATE - First air date for TV shows
- `genres`: JSONB - Array of genre objects from TMDB: `[{"id": 28, "name": "Action"}, ...]`
- `vote_average`: DECIMAL(3, 1) - Average rating
- `created_at`: TIMESTAMP WITH TIME ZONE - Creation timestamp (auto-set)
- `updated_at`: TIMESTAMP WITH TIME ZONE - Last update timestamp (auto-updated via trigger)

**Important characteristics:**

- `title`, `poster_path`, and `overview` are **multi-language JSONB in ISO format** (`xx-XX`)
- Legacy format (`xx`) is supported for backward compatibility during reads, but all new writes use ISO format
- `tmdb_id` is unique across the table
- `backdrop_path` is a simple TEXT field (not multi-language)

**Indexes:**

- `idx_titles_tmdb_id` on `tmdb_id`
- `idx_titles_type` on `type`

### Table: `seasons`

Stores TV show season information.

**Fields:**

- `id`: UUID PRIMARY KEY - Internal ID (auto-generated)
- `tv_tmdb_id`: BIGINT NOT NULL - TMDB ID of the TV show
- `season_number`: INT NOT NULL - Season number (0 for specials)
- `tmdb_season_id`: BIGINT NOT NULL - TMDB season ID
- `name`: JSONB - Multi-language season name in ISO format: `{"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}`
- `air_date`: DATE - First air date of the season
- `poster_path`: TEXT - Poster image path
- `vote_average`: NUMERIC(3, 1) - Average rating
- `overview`: JSONB - Multi-language overview in ISO format (same structure as name)
- `videos`: JSONB - Multi-language videos: `{[lang: string]: Array<{key, site, type, published_at, official}>}`
- `videos_updated_at`: TIMESTAMP WITH TIME ZONE - Last time videos were updated
- `episode_count`: INTEGER - Number of episodes in the season (calculated from TMDB)
- `created_at`: TIMESTAMP WITH TIME ZONE - Creation timestamp (auto-set)
- `updated_at`: TIMESTAMP WITH TIME ZONE - Last update timestamp (auto-updated via trigger)

**Important characteristics:**

- `name` and `overview` are **multi-language JSONB in ISO format** (`xx-XX`)
- Legacy format (`xx`) is supported for backward compatibility during reads, but all new writes use ISO format
- `name` follows the same language fallback logic as `titles.title`: if the requested language is not the primary language of the region and the name is not available, it falls back to the primary language of the region
- `videos` are fetched on-demand and stored per language
- `overview` is fetched on-demand when accessing a specific season page

**Constraints:**

- `UNIQUE(tv_tmdb_id, season_number)`: One season per number per TV show
- `UNIQUE(tmdb_season_id)`: Unique TMDB season ID

**Indexes:**

- `idx_seasons_tv_tmdb_id` on `tv_tmdb_id`
- `idx_seasons_tmdb_season_id` on `tmdb_season_id`

### Table: `user_title_status`

Stores title states for each user.

**Fields:**

- `id`: UUID PRIMARY KEY - Internal ID (auto-generated)
- `user_id`: UUID NOT NULL - User UUID (references `profiles.id` ON DELETE CASCADE)
- `tmdb_id`: INTEGER NOT NULL - Title ID in TMDB
- `type`: TEXT CHECK (type IN ('movie', 'tv')) - Content type
- `status`: TEXT NOT NULL CHECK (status IN ('seen', 'not_interested', 'watchlist')) - Title status
- `liked`: BOOLEAN DEFAULT FALSE NOT NULL - Whether the title is liked (can only be `true` when `status = 'seen'`)
- `created_at`: TIMESTAMP WITH TIME ZONE - Creation timestamp (auto-set)

**Constraints:**

- `UNIQUE(user_id, tmdb_id)`: A user can only have one state per title
- `liked` only makes sense when `status = 'seen'`
- Foreign key to `profiles(id)` with CASCADE delete

**Indexes:**

- `idx_user_title_status_user_id` on `user_id`
- `idx_user_title_status_tmdb_id` on `tmdb_id`

### Table: `recommendation_pool`

Stores the recommendation pool for each user.

**Fields:**

- `id`: UUID PRIMARY KEY - Internal ID (auto-generated)
- `user_id`: UUID NOT NULL - User UUID (references `profiles(id)` ON DELETE CASCADE)
- `tmdb_id`: INTEGER NOT NULL - Title ID
- `type`: TEXT NOT NULL CHECK (type IN ('movie', 'tv')) - Content type
- `source`: TEXT NOT NULL CHECK (source IN ('based_on_like', 'trending', 'discover', 'easy', 'mood')) - Recommendation origin
- `score`: DOUBLE PRECISION - Calculated score (can be negative)
- `explanation_code`: TEXT - Code explaining why it's recommended (see [Recommendation Explanations](#recommendation-explanations))
- `created_at`: TIMESTAMP WITH TIME ZONE - Creation timestamp (auto-set)
- `last_shown_at`: TIMESTAMP WITH TIME ZONE - Last time it was shown to the user

**Constraints:**

- `UNIQUE(user_id, tmdb_id)`: A title can only appear once in the pool
- Foreign key to `profiles(id)` with CASCADE delete

**Indexes:**

- `idx_recommendation_pool_user_id` on `user_id`
- `idx_recommendation_pool_score` on `(user_id, score DESC)`
- `idx_recommendation_pool_tmdb_id` on `tmdb_id`

**Note:** The `title_data` field has been removed. Title data is now fetched from the `titles` table when needed.

### Table: `user_preferences`

Stores user preferences.

**Fields:**

- `id`: UUID PRIMARY KEY - Internal ID (auto-generated)
- `user_id`: UUID UNIQUE NOT NULL - User UUID (references `profiles(id)` ON DELETE CASCADE)
- `favorite_genres`: INTEGER[] - Array of TMDB genre IDs
- `included_providers`: INTEGER[] - Array of TMDB provider IDs (if empty, all providers are included)
- `region`: TEXT - ISO 3166-1 alpha-2 country code (e.g., 'ES', 'US', 'MX')
- `exploration_mode`: TEXT CHECK (exploration_mode IN ('similar', 'balanced', 'surprise')) DEFAULT 'balanced' - Exploration mode
- `prioritize_content`: TEXT CHECK (prioritize_content IN ('new', 'classics', 'top_rated')) DEFAULT 'new' - Content prioritization
- `created_at`: TIMESTAMP WITH TIME ZONE - Creation timestamp (auto-set)
- `updated_at`: TIMESTAMP WITH TIME ZONE - Last update timestamp (auto-updated via trigger)

**Constraints:**

- `UNIQUE(user_id)`: One preference record per user
- Foreign key to `profiles(id)` with CASCADE delete

**Indexes:**

- `idx_user_preferences_user_id` on `user_id`

**Note:** Language is managed through URL prefixes (`/:lang/`) for SEO and routing. The app derives language deterministically from the URL (`route.params.lang`) for SEO, title, and meta tags. No cookies are used for language - it is always determined from the URL. For TMDB API calls, the app uses the user's app language from the URL (mapped to i18n code). Region is stored in `user_preferences.region` in the database.

### Table: `user_activity`

Stores user activity tracking for analytics and debugging.

**Fields:**

- `id`: UUID PRIMARY KEY - Internal ID (auto-generated)
- `user_id`: UUID NOT NULL - User UUID (references `profiles(id)` ON DELETE CASCADE)
- `action`: TEXT NOT NULL - Action type (e.g., 'login', 'logout', 'title_action', etc.)
- `metadata`: JSONB - Additional action metadata
- `ip_address`: INET - IP address of the user
- `user_agent`: TEXT - User agent string
- `created_at`: TIMESTAMP WITH TIME ZONE - Creation timestamp (auto-set)

**Constraints:**

- Foreign key to `profiles(id)` with CASCADE delete

**Indexes:**

- `idx_user_activity_user_id` on `user_id`
- `idx_user_activity_created_at` on `created_at DESC`

---

## Business Rules

### 1. Onboarding

- Users must complete onboarding before accessing recommendations
- During onboarding, they select up to 10 titles they like

#### Onboarding Flow

**Steps:**

1. **Region Selection** (mandatory)
   - User must select a region before continuing
   - Region defines the content universe

2. **Genre Selection** (optional)
   - User can select favorite genres
   - Saved to `user_preferences.favorite_genres`
   - **NOT used during pool population** (only for runtime filtering)

3. **Provider Selection** (optional)
   - User can select included providers
   - **Depends on region**: Providers are loaded based on selected region
   - If region changes, providers are cleared and reloaded
   - Saved to `user_preferences.included_providers`
   - **NOT used during pool population** (only for runtime filtering)

4. **Title Selection** (optional)
   - User can select up to 10 titles they like
   - These are saved as `liked = true` in `user_title_status`

**Pool Generation:**

- `populate-pool` is called **UNA SOLA VEZ** at the end of onboarding
- Called with `clearPool=true` to generate initial pool
- Uses **region** to define the universe
- **Does NOT use genres or providers** (they are only filters)
- Genres and providers selected during onboarding are saved but do not influence initial pool generation

**Key Principle:**

- Genres and providers in onboarding are **UX only**
- They do NOT influence:
  - Pool initial population
  - Base popularity
  - `base_score` calculation
- They are only used for runtime filtering after pool is generated
- These titles are saved as `status: 'seen'` and `liked: true`

### 2. "Liked" Limit

- Maximum 10 titles marked as "liked"
- This limit is applied at the application level (not in the database)

### 3. Title Creation

- When adding a title to `watchlist`, `seen`, or `not_interested`, it is verified that the title exists in the `titles` table
- If it doesn't exist, it is automatically fetched from TMDB and created in the database
- This ensures titles are available when querying lists (watchlist, seen, etc.)

### 4. Multi-language and SEO

- Titles are stored in multiple languages (es, ca, eu, gl, en)
- They are fetched from TMDB according to user preferences
- The system automatically detects the alphabet (Latin, Cyrillic, etc.) to display correctly

**SEO Multi-language Strategy:**

- All URLs include a language prefix: `/:lang/` (e.g., `/es/`, `/en/`, `/ca/`)
- Language codes in URLs: `es`, `ca`, `eu`, `gl`, `en`, `en-gb`
- Language is derived from URL for SEO (title, meta, canonical, hreflang)
- Cookies are used only for UX preferences, not for SEO decisions
- Each language has its own URL, including the default language (`es`)
- Sitemap generates URLs for all languages
- hreflang tags link equivalent pages across languages
- Canonical URLs point to the current page with its language

### 5. Pool Regeneration

- The pool is automatically regenerated when:
  - The user changes their **region** (defines new content universe)
- It can also be manually regenerated (onboarding, manual trigger)

**IMPORTANT**: 
- Marking/unmarking titles as "liked" does NOT regenerate the pool. Only `preference_score` is adjusted.
- Changing **language** does NOT regenerate the pool. Only affects metadata display.
- Changing **genres** or **providers** does NOT regenerate the pool. They are only runtime filters.

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

**Database constants** (`/constants/db/`):

- `TABLES`: Table names (`/constants/db/tables.ts`)
- `*_COLUMNS`: Column names for each table (`/constants/db/columns.ts`)
- `POSTGREST_ERROR_CODES`, `POSTGRES_ERROR_CODES`: Error codes (`/constants/db/errorCodes.ts`)

**Domain constants** (`/constants/domain/`):

- `TITLE_STATUS`: Title status values (`/constants/domain/titleStatus.ts`)
- `SCORE_WEIGHTS`: Scoring weights (`/constants/domain/scoring.ts`)

**API constants** (`/constants/api/`):

- `QUERY_PARAMS`: Query parameter names (`/constants/api/queryParams.ts`)

**Storage constants** (`/constants/storage/`):

- `STORAGE_KEYS`: localStorage keys (`/constants/storage/keys.ts`)

---

## Password Recovery Flow

### `auth:recovery` Flag Lifecycle

The `auth:recovery` flag is a localStorage flag used to track the password recovery flow and prevent false authentication states.

**Constant:** `STORAGE_KEYS.AUTH_RECOVERY` (defined in `/constants/storage/keys.ts`)

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

## Recommendation Source vs Explanation

### Overview

The recommendation system uses two distinct fields to track how titles enter and are displayed:

- **`source`**: Defines how a title entered `recommendation_pool`. It is persisted and never changes after insertion.
- **`explanation_code`**: Explains why a title is being shown in the current context. It can be a dynamic override (e.g., `MOOD_MATCH`). Some explanations are NOT persisted intentionally.

### Source Values (Existing)

The following `source` values are defined in the system:

- `'based_on_like'` - Based on titles the user has marked as liked
- `'trending'` - Trending titles from TMDB
- `'discover'` - Discover (algorithmic or editorial)
- `'easy'` - Easy to watch content
- `'mood'` - Mood-based recommendations

**Important**: Do NOT create new `source` values. Use existing ones.

### Explanation Code Values

The following `explanation_code` values are used:

- `'BASED_ON_LIKE'` - Persisted (shown in recommendations)
- `'TRENDING'` - Persisted (shown in recommendations)
- `'DISCOVER'` - Discover algorithmic (persisted, shown in recommendations)
- `'DISCOVER_LIST'` - Discover editorial from list (persisted, shown in recommendations)
- `'EASY_TO_WATCH'` - Persisted (shown in recommendations)
- `'MOOD_MATCH'` - NOT persisted (dynamic override only)

### Key Rules

1. **`source` is immutable**: Once a title enters the pool with a `source`, it never changes.
2. **`explanation_code` can be dynamic**: Some codes like `MOOD_MATCH` are calculated on-the-fly and never persisted.
3. **Discover differentiation**:
   - Algorithmic discover: `source='discover'`, `explanation_code='DISCOVER'`
   - Editorial discover: `source='discover'`, `explanation_code='DISCOVER_LIST'`
4. **Public Discover pages**: `DISCOVER_LIST` explanation code is NEVER rendered on public Discover pages (`/discover`, `/discover/list/[slug]`). It may be shown in personalized recommendations, but not on the public editorial pages.

---

## Discover Editorial Lists (SEO)

### Overview

Discover editorial lists are public, SEO-oriented lists with manually curated content. They are designed to generate organic traffic, showcase value without requiring registration, and convert visitors into registered users.

### Fundamental Principles

- **Discover is NOT a recommendation system**: It is stable editorial content, identical for all users.
- **Discover public pages do NOT use `recommendation_pool`**: They only use `discover_lists`, `discover_list_items`, and `titles` (via join).
- **No personalization**: Content is identical for all users, regardless of region, providers, session, or preferences.
- **Stable and indexable**: Lists are stable, SEO-friendly, and designed for search engine indexing.

### Discover List Slugs

**CRITICAL RULE**: All Discover list slugs are **always in English**.

- Slugs are stable and never change
- Slugs are not translated
- URLs include language prefix for SEO: `/:lang/discover/list/{slug}`
- Format: kebab-case, descriptive, editorial
- Example:
  - URL (ES): `/es/discover/list/best-short-series`
  - URL (EN): `/en/discover/list/best-short-series`
  - Title (ES): "Mejores series cortas para ver en pocos días"
  - Title (EN): "Best short series to binge"
- Slugs are always in English and stable across languages
- ❌ Never use non-English slugs (Spanish, Catalan, etc.)
- ❌ Never generate slugs by language
- ✅ Each language has its own URL with the same slug

### When User Uses "Use This List as a Seed"

When a user clicks "Usar esta lista como semilla" (Use this list as a seed):

1. List items are inserted into `recommendation_pool` using:
   - `source = 'discover'` (use existing value, do NOT create new)
   - `explanation_code = 'DISCOVER_LIST'` (differentiates from algorithmic 'DISCOVER')
2. Insertion is idempotent: `ON CONFLICT (user_id, tmdb_id) DO NOTHING`
3. Respects exclusions (titles already seen/marked as not_interested)
4. **CRITICAL**: Using "Usar esta lista como semilla" **never modifies Discover lists or their content**, it only affects the user's `recommendation_pool`

### Differentiation

- **Discover algorithmic**: `source='discover'`, `explanation_code='DISCOVER'`
- **Discover editorial**: `source='discover'`, `explanation_code='DISCOVER_LIST'`

### Public Discover Pages Rules

**CRITICAL**: Public Discover pages (`/discover`, `/discover/list/[slug]`) **MUST NOT** use:

- ❌ `recommendation_pool`
- ❌ `source`
- ❌ `explanation_code` (including `DISCOVER_LIST`)
- ❌ Tracking
- ❌ Personalization
- ❌ Region / providers / preferences

**Public Discover pages ONLY use:**

- ✅ `discover_lists`
- ✅ `discover_list_items`
- ✅ `titles` (direct join)
- ✅ Editorial order by `position`

### User Experience

**Non-logged users:**

- Free navigation
- See complete lists
- Access public title pages
- Soft CTA for registration
- No personalization, no visible states

**Logged users:**

- Can mark titles (seen, liked, not interested, watchlist)
- Can "Use this list as a seed" to insert titles into `recommendation_pool`
- Content itself never changes (same order, same titles, same render for all)
- Actions available depend on user, but content is always identical

### Data Structure

**`discover_lists` table:**

- `slug`: Always in English, stable, never changes
- `title`: JSONB multi-language (translatable)
- `description`: JSONB multi-language (translatable)
- `type`: Hint editorial/UI only, NOT used for logic
- `is_public`: Boolean
- `is_indexable`: Boolean

**`discover_list_items` table:**

- `discover_list_id`: Reference to list
- `tmdb_id`: Title ID
- `type`: Source of truth for content type ('movie' or 'tv')
- `position`: Editorial order, stable (changing order does NOT change URLs, does NOT affect SEO, does NOT invalidate list)

---

## Technical Architecture

This section describes the technical architecture patterns and rules for the Nuxt/Vue application, including state management, navigation, and initialization flows.

### Pinia (State Management)

#### Fundamental Rule: Pinia is Client-Only

Pinia is configured to run **only on the client**. This means:

- ✅ **YES**: Use stores in components (within `setup()`, `onMounted()`, etc.)
- ✅ **YES**: Use stores in composables that are called from components
- ❌ **NO**: Use stores in plugins
- ❌ **NO**: Use stores in middlewares (directly)
- ❌ **NO**: Use stores at the top-level of composables
- ❌ **NO**: Use stores in `.ts` files imported directly

#### Store Initialization

Pinia stores must be initialized from components, not from global plugins.

**✅ Correct:**

```vue
<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
  const userStore = useUserStore();
  // Initialize store here
});
</script>
```

**❌ Incorrect:**

```typescript
// plugins/auth.ts
export default defineNuxtPlugin(() => {
  const userStore = useUserStore(); // ❌ DO NOT do this
});
```

#### Accessing Stores in Middlewares

Middlewares may need information from stores, but must do so safely:

```typescript
export default defineNuxtRouteMiddleware(async (to) => {
  // Only execute on client
  if (import.meta.server) {
    return;
  }

  // Access store only after verifying we're on client
  const userStore = useUserStore();
  // ... middleware logic
});
```

### Navigation

#### Rule: Use `navigateTo` instead of `window.location`

**✅ Correct:**

```typescript
await navigateTo('/', { replace: true });
```

**❌ Incorrect:**

```typescript
window.location.href = '/';
window.location.assign('/');
window.location.replace('/');
```

#### Reason

- `navigateTo` is Nuxt's API for navigation
- Works correctly with SSR and client-side routing
- Does not cause full page reloads
- Maintains application state

### Auth Initialization

#### Current Architecture

Authentication initialization follows this flow:

1. **Supabase Plugin** (`plugins/supabase.client.ts`):
   - Only configures the Supabase client
   - Does NOT initialize stores
   - Does NOT access Pinia

2. **Composable `useAuthInit()`** (`composables/useAuthInit.ts`):
   - Initializes the user store from Supabase
   - Subscribes to auth changes
   - Used in components (typically `app.vue`)

3. **Root Component** (`app.vue`):
   - Calls `useAuthInit()` within `onMounted()`
   - This ensures Pinia is available before accessing stores

#### Usage Example

```vue
<!-- app.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';

const { initAuth, setupAuthListener } = useAuthInit();

onMounted(() => {
  initAuth();
  setupAuthListener();
});
</script>
```

### Plugins

#### Rules for Plugins

1. **Do not depend on Pinia stores directly**
   - If they need state, use composables or events
   - Or delegate initialization to components

2. **Only execute on client when necessary**

   ```typescript
   export default defineNuxtPlugin(() => {
     if (import.meta.server) {
       return;
     }
     // ... plugin logic
   });
   ```

3. **Keep plugins simple**
   - Configuration of external libraries
   - Setup of services
   - NO complex business logic

### Middlewares

#### Rules for Middlewares

1. **Always verify `import.meta.server`**

   ```typescript
   export default defineNuxtRouteMiddleware(async (to) => {
     if (import.meta.server) {
       return;
     }
     // ... middleware logic
   });
   ```

2. **Access stores only on client**
   - Verify `import.meta.server` before accessing stores
   - Do not use `setTimeout` or retries to "wait" for Pinia
   - If Pinia is not available, the middleware must fail in a controlled manner

3. **Use `navigateTo` for redirects**
   ```typescript
   return navigateTo('/login', { replace: true });
   ```

### Composables

#### Rules for Composables

1. **Do not access stores at the top-level**

   ```typescript
   // ❌ Incorrect
   export const useMyComposable = () => {
     const userStore = useUserStore(); // ❌ NOT at top-level
     // ...
   };

   // ✅ Correct
   export const useMyComposable = () => {
     return {
       getUserStore: () => useUserStore(), // ✅ Lazy access
     };
   };
   ```

2. **Use `computed` for lazy-loading stores**
   ```typescript
   export const useMyComposable = () => {
     const userStore = computed(() => {
       if (import.meta.server) {
         return null; // or a fallback object
       }
       return useUserStore();
     });
     // ...
   };
   ```

### Rules Summary

| Context     | Can use Pinia? | How?                                        |
| ----------- | -------------- | ------------------------------------------- |
| Components  | ✅ Yes         | Directly in `setup()` or `onMounted()`      |
| Composables | ⚠️ With care   | Lazy-load with `computed` or functions      |
| Plugins     | ❌ No          | Delegate to components or composables       |
| Middlewares | ⚠️ With care   | Only on client, verify `import.meta.server` |
| `.ts` files | ❌ No          | Move logic to composables or components     |

### Benefits of This Architecture

1. **Clarity**: Each piece has a clear responsibility
2. **Maintainability**: Easy to understand and modify
3. **No workarounds**: We don't need `setTimeout`, retries, or `@ts-ignore`
4. **SSR-safe**: No serialization issues in SSR
5. **Testable**: Each piece can be tested in isolation

---

## References

- `/constants/domain/titleStatus.ts`: Title status constants
- `/constants/domain/scoring.ts`: Score weights
- `/constants/db/tables.ts`: Database table names
- `/constants/db/columns.ts`: Database column names
- `/constants/storage/keys.ts`: localStorage keys (including `auth:recovery`)
- `/constants/api/queryParams.ts`: Query parameter names
- `server/api/users/title-status.post.ts`: Update logic
- `server/api/users/title-status.delete.ts`: Delete logic
- `supabase/schema.sql`: Database schema
- `composables/useAuth.ts`: Password recovery flag management

