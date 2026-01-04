# Design and UX Guidelines - UpNext

This document describes the design guidelines, UI components, spacing, and visual hierarchy of the UpNext application.

## Table of Contents

1. [Layout Components](#layout-components)
2. [Spacing System](#spacing-system)
3. [UI Components](#ui-components)
4. [Responsive Design](#responsive-design)
5. [Visual Hierarchy](#visual-hierarchy)
6. [Title Cards](#title-cards)
7. [Toasts and Notifications](#toasts-and-notifications)
8. [Flags and Icons](#flags-and-icons)

---

## Layout Components

### AppShell

**Location:** `components/layout/AppShell.vue`

**Purpose:** Single source of truth for shared application width.

**Behavior:**
- **Mobile:** `px-4` (1rem lateral padding)
- **Desktop (md+):** `max-w-7xl mx-auto px-6` (centered max width with padding)

**Usage:**
- Used in: Navbar, Main, Footer
- **NOT used in:** PageContainer (only handles vertical spacing)

**Example:**
```vue
<AppShell>
  <div>Content with controlled width</div>
</AppShell>
```

### PageContainer

**Location:** `components/layout/PageContainer.vue`

**Purpose:** Only handles vertical page spacing.

**Behavior:**
- `w-full`: Full width
- **Does NOT define width** (that's done by AppShell)

**Usage:**
- Used inside AppShell for consistent vertical spacing
- **Do NOT use in:** landing, auth, onboarding (special layouts)

**Example:**
```vue
<AppShell>
  <PageContainer>
    <div>Content with vertical spacing</div>
  </PageContainer>
</AppShell>
```

### Section

**Location:** `components/layout/Section.vue`

**Purpose:** Standard container for content sections.

**Behavior:**
- **Mobile:** `space-y-12` (3rem vertical separation between sections)
- **Tablet (md):** `space-y-16` (4rem separation)
- **Desktop (lg):** `space-y-24` (6rem separation)

**Special features:**
- Automatically reduces space between `SectionTitle` and its content
- Reduces space between descriptions (`<p>`) and following content
- This creates better visual hierarchy (content is closer to its title than to other sections)

**Internal spacing:**
- Between title and content: `1rem` (mobile), `1.25rem` (tablet), `1.5rem` (desktop)
- Between sections: `3rem` (mobile), `4rem` (tablet), `6rem` (desktop)

**Example:**
```vue
<Section>
  <SectionTitle>Section Title</SectionTitle>
  <p>Optional description</p>
  <div>Section content</div>
</Section>

<Section>
  <SectionTitle>Another Section</SectionTitle>
  <div>More content</div>
</Section>
```

### SectionTitle

**Location:** `components/layout/SectionTitle.vue`

**Purpose:** Standardized section titles (H2).

**Behavior:**
- **Mobile:** `text-2xl font-semibold pt-8 mb-2`
- **Tablet (md):** `text-3xl pt-10 mb-2`
- **Desktop (lg):** `pt-12 mb-3`

**Characteristics:**
- Top padding for separation from previous sections
- Reduced bottom margin (`Section` handles spacing with content)
- Uses `font-heading` for consistent typography

**Example:**
```vue
<Section>
  <SectionTitle>My Section</SectionTitle>
  <div>Content</div>
</Section>
```

---

## Spacing System

### Principle

Spacing must respect **visual hierarchy**: content should be closer to its title than to other sections.

### Spacing Rules

1. **Between different sections:**
   - Mobile: `3rem` (space-y-12)
   - Tablet: `4rem` (space-y-16)
   - Desktop: `6rem` (space-y-24)

2. **Between title and content of the same section:**
   - Mobile: `1rem` (mb-4 equivalent)
   - Tablet: `1.25rem` (mb-5 equivalent)
   - Desktop: `1.5rem` (mb-6 equivalent)

3. **Top padding of titles:**
   - Mobile: `2rem` (pt-8)
   - Tablet: `2.5rem` (pt-10)
   - Desktop: `3rem` (pt-12)

### Card Grids

**Unified rule:** All card grids use `gap-4` (1rem).

**Application:**
- Recommendation cards
- Season cards
- Episode cards
- Watchlist cards
- "Liked" cards
- "Seen" cards
- "Not interested" cards

**Example:**
```vue
<div class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
  <!-- Cards -->
</div>
```

---

## UI Components

### TitleCard

**Location:** `components/TitleCard.vue`

**Purpose:** Unified base component for all title cards.

**Features:**
- Poster/image with placeholder
- Configurable slots:
  - `top-left-badges`: Rating, watchlist badge, etc.
  - `top-right-actions`: Action menu or buttons
  - `content`: Custom content (default: title + type)
- Configurable props:
  - `aspectRatio`: 'poster' (2/3) or 'video' (16/9)
  - `showType`: Show/hide type
  - `hoverText`: Hover overlay text
  - `customClass`: Additional classes

**Structure:**
```vue
<TitleCard>
  <template #top-left-badges>
    <!-- Rating, watchlist badge, etc. -->
  </template>
  
  <template #top-right-actions>
    <!-- Action menu or buttons -->
  </template>
  
  <template #content>
    <!-- Custom content -->
  </template>
</TitleCard>
```

**Important:**
- Actions (`top-right-actions`) are **outside the `<nuxt-link>`** to prevent accidental navigation
- The `<nuxt-link>` only wraps the poster/navigable area

**Components using TitleCard:**
- `RecommendationCard`: Recommendation cards (with overview, providers, action menu)
- `TitleGrid`: Simple cards for lists (watchlist, liked, seen, not_interested)
- Inline cards in `watchlist.vue`

### RecommendationCard

**Location:** `components/RecommendationCard.vue`

**Purpose:** Recommendation card with complete information.

**Features:**
- Uses `TitleCard` as base
- Shows: rating badge, watchlist badge, action menu, overview, providers
- Custom slots for additional content

### TitleGrid

**Location:** `components/TitleGrid.vue`

**Purpose:** Grid of simple cards for lists.

**Features:**
- Uses `TitleCard` as base
- Shows: title, type, action buttons (like, remove)
- Responsive grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`

---

## Responsive Design

### Breakpoints

- **Mobile:** `< 768px` (default)
- **Tablet:** `≥ 768px` (md:)
- **Desktop:** `≥ 1024px` (lg:)
- **Large Desktop:** `≥ 1280px` (xl:)

### Mobile-First Strategy

All styles are defined first for mobile and then adjusted with breakpoints:

```vue
<!-- Mobile first -->
<div class="text-sm md:text-base lg:text-lg">
  <!-- Mobile: text-sm, Tablet+: text-base, Desktop+: text-lg -->
</div>
```

### Responsive Grids

**Standard pattern:**
```vue
<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
  <!-- 
    Mobile: 2 columns
    Small: 3 columns
    Tablet: 4 columns
    Desktop: 5 columns
    Large Desktop: 6 columns
  -->
</div>
```

---

## Visual Hierarchy

### Principle

Content should be **closer to its title** than to other sections.

### Implementation

1. **Section handles spacing between sections:**
   - `space-y-12` (mobile) to `space-y-24` (desktop)

2. **Section reduces space between title and content:**
   - Custom CSS that overrides `space-y` for elements immediately after `h2` or `p`

3. **SectionTitle has top padding:**
   - `pt-8` (mobile) to `pt-12` (desktop)

### Result

```
┌─────────────────────────┐
│  Previous Section       │
│                         │
└─────────────────────────┘
         ↓ (6rem on desktop)
┌─────────────────────────┐
│  Section Title          │ ← pt-12
│  ↓ (1.5rem)             │
│  Content                │
│  Content                │
└─────────────────────────┘
         ↓ (6rem on desktop)
┌─────────────────────────┐
│  Another Section        │
└─────────────────────────┘
```

---

## Title Cards

### Unified Structure

All title cards share:
- Poster/image with hover overlay
- Title and type
- Similar base styles (rounded-lg, backdrop-blur, etc.)
- Link to details

### Variations

**RecommendationCard:**
- Rating badge (top-left)
- Watchlist badge (top-left, below rating)
- Action menu (top-right)
- Overview in content
- Providers (logos) in content

**TitleGrid (simple lists):**
- Like button (top-left, optional)
- Remove button (top-right, optional)
- Only title and type in content

**Season/episode cards:**
- Custom structure (don't use TitleCard)
- Different proportions and content

### Hover Overlay

All cards show an overlay on hover:
- Text: "View details" (or customized)
- Background: `backdrop-blur-md` with `bg-black/80` (dark) or `bg-white/80` (light)
- Smooth transition: `opacity-0` → `opacity-100`

---

## Toasts and Notifications

### Toast Component

**Location:** `components/ui/Toast.vue`

**Purpose:** Global notifications with undo option.

### Positioning

**Mobile:**
- `bottom-4`: 1rem from bottom
- `w-[calc(100%-2rem)]`: Width respecting viewport (1rem margin on each side)
- `left-1/2 transform -translate-x-1/2`: Horizontally centered

**Desktop:**
- `bottom-6`: 1.5rem from bottom
- `w-full max-w-md mx-4`: Full width with maximum and margins

**Final class:**
```vue
class="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md md:bottom-6 md:w-full md:mx-4"
```

### Usage

```typescript
const { showToast } = useUndoToast();

// Simple toast
showToast('Success message');

// Toast with undo action
showToast(
  'Title added to watchlist',
  {
    label: 'Undo',
    variant: 'secondary',
    action: async () => {
      // Undo logic
    },
  },
  7000 // Duration in ms
);
```

### useUndoToast Composable

**Location:** `composables/useUndoToast.ts`

**Features:**
- Single global toast (only one visible at a time)
- Configurable auto-dismiss
- Optional undo action
- Duration and timeout handling

---

## Flags and Icons

### Flag Icons

**Location:** `public/icons/flags/`

**Purpose:** SVG flag icons used in language and region selectors.

**Important:** Flag files must be in `public/icons/flags/` (not in `components/icons/flags/`) because Nuxt serves static files from the `public/` directory.

### Usage in Components

Flags are used directly as images in components:

```vue
<img
  :src="`/icons/flags/${flagCode}.svg`"
  :alt="flagCode"
  class="object-contain flex-shrink-0 w-5 h-4"
  loading="lazy"
  @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
/>
```

**Standard classes:**
- `object-contain`: Maintain aspect ratio
- `flex-shrink-0`: Prevent shrinking in flex layouts
- `w-5 h-4`: Standard size (20px × 16px)
- `loading="lazy"`: Lazy load for performance
- `@error`: Hide image if file not found

### Language Flags

For language selectors (`AppLanguageSelector`, `LanguageSelector`), the following flags are used:

- `es.svg` - Spain (Español)
- `cat.svg` - Catalonia (Català)
- `gal.svg` - Galicia (Galego)
- `eus.svg` - Basque Country (Euskera)
- `us.svg` - United States (English US)
- `gb.svg` - United Kingdom (English UK)

**Mapping function:**
```typescript
const getFlagFileName = (flagCode: string): string => {
  const flagMap: Record<string, string> = {
    'ES': 'es',
    'CAT': 'cat',
    'GAL': 'gal',
    'EUS': 'eus',
    'US': 'us',
    'GB': 'gb',
  };
  return flagMap[flagCode] || flagCode.toLowerCase();
};
```

### Region Flags

For the region selector (`RegionSelector`), country flags are used according to ISO 3166-1 alpha-2 codes in lowercase (e.g., `es.svg`, `us.svg`, `mx.svg`, etc.).

The region selector automatically loads flags from `/icons/flags/${regionCode.toLowerCase()}.svg`.

### Adding New Flags

**Recommended sources:**

1. **flag-icons** (https://github.com/lipis/flag-icons)
   - Download the repository
   - Copy SVG files from `flags/4x3/` or `flags/1x1/`
   - Rename to lowercase (e.g., `ES.svg` → `es.svg`)
   - Place in `public/icons/flags/`

2. **country-flag-icons** (https://github.com/catamphetamine/country-flag-icons)
   - Similar to above

3. **SVG Flags** (https://flagpedia.net/download/api)
   - API to download SVG flags

**Format:**
- File name: lowercase ISO code (e.g., `es.svg`, `us.svg`)
- Format: SVG
- ViewBox: Recommended `0 0 640 480` or `0 0 1 1` for square flags
- Size: Optimize for web (typically 1-5KB per file)

---

## Colors and Themes

### Dark Mode

The application supports dark mode using Tailwind classes:
- `dark:bg-gray-900`: Dark backgrounds
- `dark:text-gray-300`: Light text
- `dark:border-white/10`: Subtle borders

### Color Palette

- **Primary:** Main brand color
- **Gray:** Gray scale for backgrounds and text
- **Success/Error:** For messages and states

---

## Accessibility

### ARIA Labels

All interactive elements must have appropriate `aria-label`:
- Action buttons: `aria-label="Action on title"`
- Links: `aria-label="View details of {title}"`
- Images: Descriptive `alt`

### Keyboard Navigation

- All interactive elements must be accessible with Tab
- Visible focus with `focus:ring-2 focus:ring-primary`
- Tooltips visible on focus for better UX

### Contrast

- Text on background: minimum 4.5:1 (WCAG AA)
- Large text: minimum 3:1 (WCAG AA)

---

## Best Practices

### 1. Use Layout Components

Always use `Section`, `SectionTitle`, `PageContainer`, `AppShell` instead of creating custom styles.

### 2. Consistent Spacing

- Use `gap-4` for all card grids
- Use `Section` for separation between sections
- Don't add unnecessary manual margins

### 3. Responsive First

- Start with mobile styles
- Add breakpoints only when necessary
- Test on different screen sizes

### 4. Reusable Components

- Use `TitleCard` for all title cards
- Create base components and extend with slots
- Avoid code duplication

### 5. Visual Hierarchy

- Maintain the principle: content closer to its title than to other sections
- Use `Section` and `SectionTitle` for consistent structure
- Adjust spacing only when necessary

---

## References

- `components/layout/`: Layout components
- `components/TitleCard.vue`: Base card component
- `components/ui/Toast.vue`: Notification component
- `composables/useUndoToast.ts`: Toast composable
- `public/icons/flags/`: Flag SVG files
- `components/AppLanguageSelector.vue`: App language selector with flags
- `components/LanguageSelector.vue`: Content language selector with flags
- `components/RegionSelector.vue`: Region selector with flags
