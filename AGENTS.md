# AGENTS.md

This document defines non-negotiable rules for humans and AI agents working on this project.

Failure to follow these rules results in architectural drift, broken assumptions, and unstable behavior.
These rules exist to protect stability, not to optimize for speed or cleverness.

---

## Global Conventions

- npm is mandatory for all operations
- Do not use pnpm or yarn under any circumstances
- TypeScript is required
- Tailwind CSS is the only styling solution
- Icons must come from tabler-icons
  - Explicit imports only
  - Never use barrel imports
- Prefer ESM and modern browser syntax
- The framework used in this project is Nuxt 3


---

## Project Structure (Canonical)

This project has a strict, intentional, and non-negotiable folder structure.

The following tree is the canonical project structure.
Agents must treat it as a contract, not a suggestion.

No new folders, subfolders, or structural changes may be introduced unless explicitly requested.

```text
/components
/layout -> Layout primitives (AppShell, Section, PageContainer)
/ui -> Reusable UI components with behavior
/features -> Domain-specific components (only if justified)
/typography -> Typography primitives (labels, titles, body text)

/composables -> Shared client-side logic
/layouts -> Nuxt layouts (must remain simple)
/pages -> Route-based pages only
/middleware -> Route guards and access control
/plugins -> Nuxt plugins (configuration only)
/server -> Server-only logic and API routes
/stores -> Pinia stores (client-only)
/utils -> Pure helper functions (no side effects)
/constants -> Domain, DB, API, and storage constants
/docs -> Project documentation (SOURCE OF TRUTH)

README.md -> Project overview and onboarding
AGENTS.md -> Contribution and agent rules
```


This structure is NOT negotiable.

---

## Forbidden Structural Changes (Hard Rule)

Unless explicitly requested, an agent must NOT:

- Create new top-level folders
- Introduce new subfolder categories
  - Examples: services, hooks, shared, repositories, core
- Restructure existing folders
- Rename folders
- Move files for clarity or organization
- Split files purely to reduce size

If a task requires altering the folder structure:

- STOP
- Explain why
- Ask for confirmation
- Do NOTHING until approved

---

## Folder Ownership Rules

Each folder has a single, clear responsibility.

Agents must NOT move logic between folders unless explicitly instructed.

### components

- UI and visual behavior only
- No business rules
- No hidden side effects
- No recommendation logic
- Data fetching only if trivial and UI-driven

### composables

- Shared client-side logic
- Orchestrates flows
- May depend on route, locale, UI state
- Must NOT hide product or business rules

### pages

- Page orchestration only
- May compose multiple composables
- Can be long if readability is preserved
- Pages express flows, not abstractions

### server

- Server-only logic
- API routes and database access
- No UI logic
- No assumptions about client behavior

### stores

- Pinia stores (client-only)
- No server usage
- No initialization in plugins

### utils

- Pure functions only
- No side effects
- No framework dependencies
- No API calls

### constants

- Domain, database, API, and storage constants
- No logic
- No runtime behavior

If logic does not clearly belong to a folder:

- STOP
- Ask for confirmation

---

## Nuxt-Specific Rules

- Follow Nuxt 3 conventions strictly
- Do NOT fight the framework
- Do NOT reimplement Nuxt features

### Auto-imports

Use Nuxt auto-imports where appropriate:

- useRoute
- useRouter
- useFetch
- useAsyncData
- useState
- ref
- computed

Rules:

- Do NOT manually import auto-imported utilities
- Do NOT disable auto-imports for stylistic reasons

---

## Composables Rules

- Shared logic must live in composables
- Composables must:
  - Be focused and explicit
  - Avoid hiding business rules
  - Avoid side effects unless documented
- Do NOT create composables prematurely
- Logic used only once must remain local

---

## Server & API Rules

- Server logic lives under server
- Respect separation between:
  - Server-only logic
  - Client or UI logic
- Never assume API behavior
- Validate against docs before changing endpoints
- Do NOT access server routes from SEO or editorial pages unless documented

---

## Data Fetching Rules

- Prefer useFetch and useAsyncData
- No custom fetch wrappers without documentation
- No caching, deduplication, or revalidation unless documented
- No personalization on SEO or public pages unless explicitly allowed

---

## Routing & Pages

- Routing is file-based
- No dynamic routes without documentation support
- URLs, slugs, and ordering must match docs
- Do NOT alter routing structure without approval

---

## Layouts

- Layouts must remain simple and stable
- Do NOT inject business or recommendation logic into layouts
- Layout changes affecting SEO require documentation validation

---

## State Management

- Prefer Nuxt primitives such as useState
- Do NOT introduce global state casually
- Avoid coupling UI state with recommendation logic

---

## Middleware

- Use middleware sparingly
- Middleware must be explicit and predictable
- Do NOT alter SEO, routing, or visibility unless documented

---

## TypeScript Rules

- Avoid any and unknown
- Prefer inference when possible
- If types are unclear:
  - STOP
  - Ask for clarification
  - Continue only after confirmation

---

## UI & Styling Rules

- Tailwind CSS is mandatory
- No inline styles
- No CSS files
- Do not duplicate class lists if a component can be extracted
- Accessibility is not optional:
  - Use semantic HTML
  - Apply ARIA where appropriate
  - Manage focus correctly

---

## Internationalization & Language Rules

This application is fully multilingual.

### Translation Keys (Strict)

- Hardcoded user-facing text is forbidden
- When adding a new text:
  - Generate a translation key
  - Add it to ALL supported languages
- Adding a key in a single language is NOT acceptable

If the list of supported languages is unclear:

- STOP
- Ask for clarification

### No Hardcoded Values (Strict)

- **Never hardcode user-facing text** - Always use translation keys from `i18n/locales/`
- **Never hardcode string literals for status, types, or domain values** - Use enums from `/constants/domain/` or `/types/enums/`
- **Never hardcode database values** - Use constants from `/constants/db/`
- **Never hardcode API values** - Use constants from `/constants/api/`
- **Never hardcode magic strings or numbers** - Extract to constants or enums

Examples:
- ❌ `if (status === 'Ended')` → ✅ `if (status === TmdbStatus.ENDED)`
- ❌ `'tv'` → ✅ `MEDIA_TYPE.TV`
- ❌ `'user_title_status'` → ✅ `TABLES.USER_TITLE_STATUS`
- ❌ `'Error loading data'` → ✅ `$t('errors.loadingData')`

If you need a new enum or constant:

- STOP
- Check if it already exists
- If not, create it in the appropriate `/constants/` or `/types/enums/` location
- Update all usages to use the new enum/constant

### Documentation & Comments Language

- All documentation must be written in English
- Do NOT write documentation in Spanish
- All code comments must be written in English

---

## Testing & Quality

- Review CI workflows in .github/workflows
- Code with type errors, lint errors, or failing tests is NOT acceptable

Commands:

```bash
npm run lint
npm test
```


Add or update tests whenever behavior changes.

---

## Performance Rules

- Do NOT guess performance
- Always measure first
- No optimizations without evidence
- No caching or memoization unless explicitly documented

---

## Commits & Pull Requests

### Pull Request Title Format

```text
[<project_name>] Clear and concise description
```

### Rules

- Keep PRs small and focused
- Each PR must clearly explain:
  - What changed
  - Why it changed
  - How it was verified

---

## Documentation Is the Source of Truth

alwaysApply: true

Before implementing, refactoring, or suggesting anything:

- Read ALL files in docs
- Follow the priority order:
  - Documentation > Code > Intuition
- Do NOT invent logic
- Do NOT improve behavior unless explicitly requested

If code conflicts with documentation:

- STOP
- Explain the conflict
- Propose options
- Do NOT proceed without confirmation

---
description: Review UI code for Vercel Web Interface Guidelines compliance
argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review these files for compliance: $ARGUMENTS

Read files, check against rules below. Output concise but comprehensive—sacrifice grammar for brevity. High signal-to-noise.

## Rules

### Accessibility

- Icon-only buttons need `aria-label`
- Form controls need `<label>` or `aria-label`
- Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)
- `<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)
- Images need `alt` (or `alt=""` if decorative)
- Decorative icons need `aria-hidden="true"`
- Async updates (toasts, validation) need `aria-live="polite"`
- Use semantic HTML (`<button>`, `<a>`, `<label>`, `<table>`) before ARIA
- Headings hierarchical `<h1>`–`<h6>`; include skip link for main content
- `scroll-margin-top` on heading anchors

### Focus States

- Interactive elements need visible focus: `focus-visible:ring-*` or equivalent
- Never `outline-none` / `outline: none` without focus replacement
- Use `:focus-visible` over `:focus` (avoid focus ring on click)
- Group focus with `:focus-within` for compound controls

### Forms

- Inputs need `autocomplete` and meaningful `name`
- Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`
- Never block paste (`onPaste` + `preventDefault`)
- Labels clickable (`htmlFor` or wrapping control)
- Disable spellcheck on emails, codes, usernames (`spellCheck={false}`)
- Checkboxes/radios: label + control share single hit target (no dead zones)
- Submit button stays enabled until request starts; spinner during request
- Errors inline next to fields; focus first error on submit
- Placeholders end with `…` and show example pattern
- `autocomplete="off"` on non-auth fields to avoid password manager triggers
- Warn before navigation with unsaved changes (`beforeunload` or router guard)

### Animation

- Honor `prefers-reduced-motion` (provide reduced variant or disable)
- Animate `transform`/`opacity` only (compositor-friendly)
- Never `transition: all`—list properties explicitly
- Set correct `transform-origin`
- SVG: transforms on `<g>` wrapper with `transform-box: fill-box; transform-origin: center`
- Animations interruptible—respond to user input mid-animation

### Typography

- `…` not `...`
- Curly quotes `"` `"` not straight `"`
- Non-breaking spaces: `10&nbsp;MB`, `⌘&nbsp;K`, brand names
- Loading states end with `…`: `"Loading…"`, `"Saving…"`
- `font-variant-numeric: tabular-nums` for number columns/comparisons
- Use `text-wrap: balance` or `text-pretty` on headings (prevents widows)

### Content Handling

- Text containers handle long content: `truncate`, `line-clamp-*`, or `break-words`
- Flex children need `min-w-0` to allow text truncation
- Handle empty states—don't render broken UI for empty strings/arrays
- User-generated content: anticipate short, average, and very long inputs

### Images

- `<img>` needs explicit `width` and `height` (prevents CLS)
- Below-fold images: `loading="lazy"`
- Above-fold critical images: `priority` or `fetchpriority="high"`

### Performance

- Large lists (>50 items): virtualize (`virtua`, `content-visibility: auto`)
- No layout reads in render (`getBoundingClientRect`, `offsetHeight`, `offsetWidth`, `scrollTop`)
- Batch DOM reads/writes; avoid interleaving
- Prefer uncontrolled inputs; controlled inputs must be cheap per keystroke
- Add `<link rel="preconnect">` for CDN/asset domains
- Critical fonts: `<link rel="preload" as="font">` with `font-display: swap`

### Navigation & State

- URL reflects state—filters, tabs, pagination, expanded panels in query params
- Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)
- Deep-link all stateful UI (if uses `useState`, consider URL sync via nuqs or similar)
- Destructive actions need confirmation modal or undo window—never immediate

### Touch & Interaction

- `touch-action: manipulation` (prevents double-tap zoom delay)
- `-webkit-tap-highlight-color` set intentionally
- `overscroll-behavior: contain` in modals/drawers/sheets
- During drag: disable text selection, `inert` on dragged elements
- `autoFocus` sparingly—desktop only, single primary input; avoid on mobile

### Safe Areas & Layout

- Full-bleed layouts need `env(safe-area-inset-*)` for notches
- Avoid unwanted scrollbars: `overflow-x-hidden` on containers, fix content overflow
- Flex/grid over JS measurement for layout

### Dark Mode & Theming

- `color-scheme: dark` on `<html>` for dark themes (fixes scrollbar, inputs)
- `<meta name="theme-color">` matches page background
- Native `<select>`: explicit `background-color` and `color` (Windows dark mode)

### Locale & i18n

- Dates/times: use `Intl.DateTimeFormat` not hardcoded formats
- Numbers/currency: use `Intl.NumberFormat` not hardcoded formats
- Detect language via `Accept-Language` / `navigator.languages`, not IP

### Hydration Safety

- Inputs with `value` need `onChange` (or use `defaultValue` for uncontrolled)
- Date/time rendering: guard against hydration mismatch (server vs client)
- `suppressHydrationWarning` only where truly needed

### Hover & Interactive States

- Buttons/links need `hover:` state (visual feedback)
- Interactive states increase contrast: hover/active/focus more prominent than rest

### Content & Copy

- Active voice: "Install the CLI" not "The CLI will be installed"
- Title Case for headings/buttons (Chicago style)
- Numerals for counts: "8 deployments" not "eight"
- Specific button labels: "Save API Key" not "Continue"
- Error messages include fix/next step, not just problem
- Second person; avoid first person
- `&` over "and" where space-constrained

### Anti-patterns (flag these)

- `user-scalable=no` or `maximum-scale=1` disabling zoom
- `onPaste` with `preventDefault`
- `transition: all`
- `outline-none` without focus-visible replacement
- Inline `onClick` navigation without `<a>`
- `<div>` or `<span>` with click handlers (should be `<button>`)
- Images without dimensions
- Large arrays `.map()` without virtualization
- Form inputs without labels
- Icon buttons without `aria-label`
- Hardcoded date/number formats (use `Intl.*`)
- `autoFocus` without clear justification

## Output Format

Group by file. Use `file:line` format (VS Code clickable). Terse findings.

```text
## src/Button.tsx

src/Button.tsx:42 - icon button missing aria-label
src/Button.tsx:18 - input lacks label
src/Button.tsx:55 - animation missing prefers-reduced-motion
src/Button.tsx:67 - transition: all → list properties

## src/Modal.tsx

src/Modal.tsx:12 - missing overscroll-behavior: contain
src/Modal.tsx:34 - "..." → "…"

## src/Card.tsx

✓ pass
```

State issue + location. Skip explanation unless fix non-obvious. No preamble.

---

## AI Agent Operating Mode (Strict)

This section applies exclusively to AI agents.

### Core Principles

- Stability > Cleverness
- Explicit > Abstract
- Duplication > Indirection
- Documentation > Assumptions

### Execution Rules

An AI agent may execute immediately ONLY IF:

- The task is small
- The scope is explicit
- The behavior is documented

Otherwise, the agent MUST:

- STOP
- Summarize its understanding
- Ask for confirmation
- Wait

### Absolute Prohibitions

An AI agent must NEVER:

- Guess product intent
- Invent structure
- Fill gaps creatively
- Infer business rules from code
- Fix things that are not broken

### Default Safe Mode

When in doubt:

- Do nothing
- Ask
