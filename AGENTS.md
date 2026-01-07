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
