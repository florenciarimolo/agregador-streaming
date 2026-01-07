# AGENTS.md

## Global Conventions

- **npm is mandatory** for all operations.
- **Do not** use pnpm or yarn under any circumstances.
- **TypeScript is required**.
- **Tailwind CSS is the only styling solution**.
- Icons must come from **tabler-icons**:
  - Explicit imports only
  - Never use barrel imports
- Prefer **ESM** and modern browser syntax at all times.
- The framework used in this project is **Nuxt 3**.

---

## Nuxt-Specific Rules

- This project follows **Nuxt 3 conventions strictly**.
- Do not fight the framework.
- Do not reimplement features Nuxt already provides.

### Auto-imports

- Use Nuxt auto-imports where appropriate:
  - `useRoute`
  - `useRouter`
  - `useFetch`
  - `useAsyncData`
  - `useState`
  - `ref`
  - `computed`
- Do **not** manually import auto-imported utilities unless strictly required.
- Do **not** disable auto-imports to satisfy personal preferences.

### Composables

- Shared logic must live in `composables/`.
- Composables must:
  - Be focused and explicit
  - Avoid hiding business rules
  - Avoid side effects unless explicitly documented
- Do not create composables prematurely.
- Logic used only once must remain local.

### Server & API Routes

- Server logic must live under `server/`.
- Respect the separation between:
  - Server-only logic
  - Client/UI logic
- Do not access server routes from SEO or editorial pages unless explicitly documented.
- Never assume API behavior.
- Validate against `/docs` before changing endpoints.

### Data Fetching

- Prefer `useFetch` and `useAsyncData`.
- Do not introduce custom fetch wrappers without documentation.
- Do not add caching, revalidation, or deduplication strategies unless documented.
- No personalization or dynamic behavior on SEO or public pages unless explicitly allowed.

### Pages & Routing

- Routing is file-based.
- Do not introduce dynamic routes (`[slug]`, `[...catchAll]`) without documentation support.
- URLs, slugs, ordering, and stability rules must match `/docs`.
- Do not alter routing structure unless explicitly requested.

### Layouts

- Layouts must remain simple and stable.
- Do not inject business or recommendation logic into layouts.
- Layout changes affecting SEO or editorial structure require documentation validation.

### State Management

- Prefer Nuxt primitives (`useState`).
- Do not introduce global state casually.
- Avoid hidden coupling between state and recommendation logic.

### Middleware

- Use middleware sparingly.
- Middleware must be explicit and easy to reason about.
- Do not add middleware that alters SEO, routing, or content visibility unless documented.

---

## Code Organization

- Build small components with a single responsibility.
- Prefer composition over complex configuration.
- Avoid premature abstractions.
- Shared code must live in clearly named folders:
  - `components`
  - `layouts`
  - `lib`
  - `utils`

---

## TypeScript Rules

- Avoid `any` and `unknown`.
- Prefer type inference whenever possible.
- If types are unclear:
  - Stop
  - Ask for clarification
  - Continue only after confirmation

---

## UI & Styling

- Tailwind CSS is the only styling approach.
- Do not duplicate class lists if a component can be extracted.
- Prioritize readability over visual micro-optimizations.
- Accessibility is not optional:
  - Use semantic HTML
  - Apply ARIA roles when appropriate
  - Manage focus correctly

---

## Internationalization & Language Rules

- This application is **fully multilingual**.
- **Hardcoded user-facing text is forbidden**.

### Translation Keys

- All user-visible text **must** use i18n translation keys.
- When adding a new text:
  - Always generate the translation key
  - Always add it to **all supported languages**
- Adding a key in a single language is **not acceptable**.
- If the full list of languages is unclear:
  - Stop
  - Ask for clarification
  - Do not guess

### Language Consistency

- All documentation must be written in **English**.
- Do **not** write documentation in Spanish or mix languages.
- If existing documentation is in Spanish and needs to be updated:
  - Rewrite it in English unless explicitly told otherwise

### Code Comments

- All code comments must be written in **English**.
- Do not introduce comments in Spanish.

---

## Testing & Quality

- Review CI workflows in `.github/workflows`.

- Run tests using:
  ```bash
  npm test
  ```

- Or:
  ```bash
  npm run turbo:test -- --filter <project_name>
  ```

- For Vitest:
  ```bash
  npm run vitest -- run -t "<test_name>"
  ```

- After moving files or changing imports, always run:
  ```bash
  npm run lint
  ```

- Code with type errors, lint errors, or failing tests is not acceptable.
- Add or update tests whenever behavior changes, even if not explicitly requested.

---

## Performance & Technical Decisions

- Do not guess performance, bundle size, or load times.
- Always measure first.
- If something feels slow:
  - Add instrumentation before optimizing
- Validate changes on a small scale before rolling them out globally.

---

## Commits & Pull Requests

- PR title format:
  ```text
  [<project_name>] Clear and concise description
  ```
- Keep PRs small and focused.
- Before committing, always run:
  ```bash
  npm run lint
  npm test
  ```
- Clearly explain:
  - What changed
  - Why it changed
  - How it was verified
- If you introduce a new rule, document it in this file.

---

## Agent Behavior

- If a request is unclear, ask specific questions before acting.
- Simple, well-defined tasks may be executed directly.
- Complex changes require confirmation before execution:
  - Refactors
  - New features
  - Architectural decisions
- Do not assume implicit requirements.
- Missing information must be requested.
- Do not add `console.log`, `console.debug`, or similar statements
  unless explicitly requested for debugging purposes.

- Before considering a task finished, always:
  - Check for linting errors
  - Check for linting warnings
  - Fix them unless explicitly told not to

---

## Documentation Is the Source of Truth

- **alwaysApply: true**
- This project has strict architectural and product rules documented in `/docs`.

Before implementing, refactoring, or suggesting any solution:

- Read all documentation files in `/docs`.
- Treat documentation as the single source of truth:
  - Do not invent logic or patterns
  - Do not improve behavior unless requested
  - Ask if something is unclear
- Follow documented principles strictly:
  - Editorial vs recommendation separation
  - No personalization on SEO/public pages
  - No forbidden recommendation pools
  - Respect `source` vs `explanation_code`
  - Respect SEO stability rules
- If a request conflicts with documentation:
  - Stop
  - Explain the conflict
  - Propose options

---

## Forbidden Patterns in Nuxt (Hard Rules)

- If any of the following are required, stop and ask for confirmation.

### Architecture & Framework Abuse

- Reimplement Nuxt features (routing, SSR, data fetching, state).
- Introduce custom frameworks or meta-architectures.
- Add global plugins or injections without documentation.
- Disable Nuxt defaults for stylistic reasons.

### Over-engineering

- Introduce service layers, repositories, use cases, or clean architecture patterns.
- Abstract logic used only once.
- Create generic utilities for future use.

### Data & Product Logic

- Infer business logic from code.
- Change recommendation behavior intuitively.
- Share logic between editorial/SEO and recommendations unless documented.
- Add personalization where it does not explicitly exist.

### SEO & Public Pages

- Make SEO, Discover, or editorial pages dynamic or personalized.
- Add client-side fetching where static or SSR is expected.
- Change slugs, URLs, ordering, or structure without documentation.

### State & Side Effects

- Introduce global state casually.
- Hide side effects inside composables.
- Couple UI state with recommendation logic.
- Persist state implicitly unless documented.

### Performance Guessing

- Optimize without measurements.
- Change caching or revalidation strategies arbitrarily.
- Add memoization or throttling preemptively.

---

## AI Agent Operating Mode (Strict)

- This section applies specifically to AI agents.

### Operating Principles

- Documentation > Code > Intuition
- If it is not written in `/docs`, it is not safe to assume.
- Stability is a feature, not a limitation.

### Execution Rules

- Execute immediately only if:
  - The task is small
  - The scope is explicit
  - The behavior is documented
- Do not execute if:
  - Product behavior may change
  - Architecture may be affected
  - SEO, Discover, or recommendations are involved

In those cases:

- Stop
- Summarize understanding
- Ask for confirmation

### Communication Requirements

- Before complex changes, explicitly state:
  - Files that will change
  - Behavior that will change
  - Behavior that will not change
- No silent refactors.
- No drive-by improvements.

### Decision Constraints

- An AI agent must never:
  - Guess product intent
  - Fill gaps creatively
  - Infer rules from patterns
  - Fix things that are not broken

If a decision is ambiguous:

- Ask
- Wait
- Do nothing

### Default Safe Mode

- When in doubt, choose:
  - Explicit code over abstraction
  - Duplication over indirection
  - Stability over cleverness
