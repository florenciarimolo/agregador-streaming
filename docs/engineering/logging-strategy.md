# Logging & Error Reporting Strategy

This document defines the logging and error reporting strategy for the UpNext application. All developers and AI agents must follow these rules strictly.

## General Principle

**Logs are for understanding production behavior, not for temporary debugging.**

If a log does not help diagnose a real user issue, it must not exist.

---

## console.log

### Allowed Usage

- **Development-only debugging**: Temporary value inspection during development
- **Scripts**: Build scripts, migration scripts, and other development tools

### Rules

- ❌ **Must never ship to production**
- ❌ **Must be removed before merge**
- ❌ **Must not exist in services, shared composables, or utils**
- ✅ **Allowed only in**: Pages (temporary debugging), scripts, and one-off debugging sessions

### Examples

**❌ Incorrect:**

```typescript
// In a composable or service
console.log('[Recommendations] User likes:', likes);
console.log('[TitleActions] Status updated:', status);
```

**✅ Correct:**

```typescript
// Temporary debugging in a page (must be removed before merge)
if (import.meta.dev) {
  console.log('[Debug] User likes:', likes);
}
```

---

## console.warn

### Use Only For

- Unexpected but recoverable situations
- Fallbacks when expected data is missing
- Missing optional data that doesn't break functionality
- Deprecation warnings

### Rules

- ✅ **Always include feature context** in the message (e.g., `[FeatureName]`)
- ✅ **No raw objects** - serialize or describe the data
- ❌ **Do NOT send to Sentry** - warnings are informational, not errors

### Format

```typescript
console.warn(
  '[FeatureName] Description of the recoverable issue',
  additionalContext
);
```

### Examples

**✅ Correct:**

```typescript
console.warn('[Recommendations] Missing mood filter, falling back to default');
console.warn(
  '[VideoFetch] No videos found in requested language, using fallback'
);
console.warn('[Auth] Session expired, redirecting to login');
```

**❌ Incorrect:**

```typescript
console.warn('Missing data:', rawObject); // No context, raw object
console.warn('Error occurred'); // Too vague, no feature context
```

---

## console.error

### Use When

- A critical operation fails
- An impossible state is reached
- The expected flow cannot be completed
- User-facing errors occur
- External services fail (Supabase, TMDB)
- SSR errors happen

### Rules

- ✅ **Always include feature context** in the message
- ✅ **In production, every `console.error` must be paired with `Sentry.captureException()`**
- ✅ **Include relevant context** for debugging (user ID, request ID, etc.)

### Format

```typescript
console.error('[FeatureName] Error description:', error);
Sentry.captureException(error, {
  tags: { feature: 'FeatureName' },
  extra: { context: 'additional info' },
});
```

### Examples

**✅ Correct:**

```typescript
try {
  await updateTitleStatus(tmdbId, status);
} catch (error) {
  console.error('[TitleStatus] Failed to update title status:', error);
  Sentry.captureException(error, {
    tags: { feature: 'TitleStatus', tmdbId },
    extra: { status, userId },
  });
  throw error;
}
```

**❌ Incorrect:**

```typescript
catch (error) {
  console.error('Error:', error); // No context, no Sentry
}
```

---

## Sentry Integration

### Send Errors to Sentry When

- ✅ User-facing flow breaks
- ✅ Unexpected errors occur
- ✅ SSR errors happen
- ✅ External services fail (Supabase, TMDB)
- ✅ The issue requires tracking and fixing

### Do NOT Send to Sentry

- ❌ Expected empty states
- ❌ User validation errors (e.g., invalid email format)
- ❌ Normal alternative flows (e.g., fallback to default)
- ❌ Recoverable warnings (use `console.warn` instead)

### Best Practices

1. **Use helper functions**: Use `logError()` from `server/utils/logger.ts` or `useLogger()` composable
2. **Add context tags**: Include feature name, user ID, request ID when available
3. **Include extra data**: Add relevant debugging information
4. **Don't send sensitive data**: Never log passwords, tokens, or PII

### Examples

**✅ Correct:**

```typescript
import { logError } from '~/server/utils/logger';

try {
  await fetchRecommendations(userId);
} catch (error) {
  logError('[Recommendations] Failed to fetch recommendations', error, {
    userId,
    region: userRegion,
  });
  throw error;
}
```

---

## Logging Utilities

### Server-Side: `server/utils/logger.ts`

Use these utilities in server code:

- `devLog(...args)` - Development-only logging (removed in production)
- `logWarn(message, context?)` - Recoverable warnings with feature context
- `logError(message, error, context?)` - Critical errors with automatic Sentry integration

### Client-Side: `composables/useLogger.ts`

Use this composable in client code:

```typescript
const { logWarn, logError } = useLogger();

logWarn('[FeatureName] Warning message', { context });
logError('[FeatureName] Error message', error, { context });
```

---

## Enforcement

### ESLint Rules

ESLint automatically enforces:

- ❌ `console.log` is disallowed in: `server/`, `composables/`, `services/`, `utils/`
- ✅ `console.log` is allowed in: `pages/`, `scripts/` (for temporary debugging)
- ⚠️ `console.warn` and `console.error` require feature context

### Code Review

During code review, verify:

1. No `console.log` in production code paths
2. All `console.error` are paired with Sentry
3. All `console.warn` include feature context
4. Development logs are removed before merge

---

## Migration Guide

### Replacing console.log

**Before:**

```typescript
console.log('[Feature] Data:', data);
```

**After (if needed for production):**

```typescript
// Use logWarn if it's a recoverable issue
logWarn('[Feature] Missing expected data', { data });
```

**After (if temporary debugging):**

```typescript
// Remove entirely before merge
```

### Replacing console.warn

**Before:**

```typescript
console.warn('Missing data:', data);
```

**After:**

```typescript
logWarn('[FeatureName] Missing optional data, using default', {
  dataType: 'data',
});
```

### Replacing console.error

**Before:**

```typescript
console.error('Error:', error);
```

**After:**

```typescript
logError('[FeatureName] Operation failed', error, { context });
```

---

## Anti-Patterns

### ❌ Don't Do This

```typescript
// Raw console.log in production code
console.log(data);

// Error without Sentry
console.error('Failed:', error);

// Warning without context
console.warn('Something went wrong');

// Logging sensitive data
console.log('User token:', token);

// Logging in loops (performance issue)
items.forEach((item) => console.log(item));
```

### ✅ Do This Instead

```typescript
// Use proper logging utilities
logWarn('[Feature] Missing data', { dataType });

// Error with Sentry
logError('[Feature] Operation failed', error, { context });

// Warning with context
logWarn('[Feature] Recoverable issue, using fallback');

// Never log sensitive data
// Remove or sanitize before logging

// Batch logging or use structured logging
logWarn('[Feature] Processing items', { count: items.length });
```

---

## Summary

| Log Type        | Use For             | Sentry?     | Production? |
| --------------- | ------------------- | ----------- | ----------- |
| `console.log`   | Temporary debugging | ❌          | ❌ Never    |
| `console.warn`  | Recoverable issues  | ❌          | ✅ Yes      |
| `console.error` | Critical failures   | ✅ Required | ✅ Yes      |

**Remember**: If a log doesn't help diagnose a real user issue in production, it shouldn't exist.
