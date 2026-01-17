/**
 * Server-side logging utilities
 *
 * Follows the logging strategy defined in docs/engineering/logging-strategy.md
 *
 * - devLog: Development-only logging (removed in production)
 * - logWarn: Recoverable warnings with feature context
 * - logError: Critical errors with automatic Sentry integration
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Development-only logging
 * Use for temporary debugging during development
 * Must be removed before merge if not needed for production
 */
export const devLog = (...args: unknown[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

/**
 * Log a recoverable warning
 *
 * Use for unexpected but recoverable situations, fallbacks, or missing optional data.
 * Always includes feature context in the message.
 *
 * @param message - Warning message with feature context (e.g., '[FeatureName] Description')
 * @param context - Optional additional context (will be serialized, no raw objects)
 *
 * @example
 * logWarn('[Recommendations] Missing mood filter, falling back to default');
 * logWarn('[VideoFetch] No videos found in requested language', { lang: 'es' });
 */
export const logWarn = (message: string, context?: Record<string, unknown>) => {
  // Ensure message includes feature context
  if (!message.includes('[') || !message.includes(']')) {
    console.warn(
      '[Logger] Warning message missing feature context. Message:',
      message
    );
  }

  if (context) {
    // Serialize context to avoid logging raw objects
    const serializedContext = Object.entries(context)
      .map(([key, value]) => {
        if (value === null || value === undefined) {
          return `${key}: null`;
        }
        if (typeof value === 'object') {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${String(value)}`;
      })
      .join(', ');
    console.warn(message, `{ ${serializedContext} }`);
  } else {
    console.warn(message);
  }
};

/**
 * Log a critical error with automatic Sentry integration
 *
 * Use when a critical operation fails, an impossible state is reached,
 * or the expected flow cannot be completed.
 *
 * In production, automatically sends the error to Sentry.
 *
 * @param message - Error message with feature context (e.g., '[FeatureName] Description')
 * @param error - The error object
 * @param context - Optional additional context for debugging
 *
 * @example
 * try {
 *   await updateTitleStatus(tmdbId, status);
 * } catch (error) {
 *   logError('[TitleStatus] Failed to update title status', error, { tmdbId, status });
 *   throw error;
 * }
 */
export const logError = (
  message: string,
  error: unknown,
  context?: Record<string, unknown>
) => {
  // Ensure message includes feature context
  if (!message.includes('[') || !message.includes(']')) {
    console.error(
      '[Logger] Error message missing feature context. Message:',
      message
    );
  }

  // Extract feature name from message for Sentry tags
  const featureMatch = message.match(/\[([^\]]+)\]/);
  const featureName = featureMatch ? featureMatch[1] : 'Unknown';

  // Log to console
  if (context) {
    const serializedContext = Object.entries(context)
      .map(([key, value]) => {
        if (value === null || value === undefined) {
          return `${key}: null`;
        }
        if (typeof value === 'object') {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${String(value)}`;
      })
      .join(', ');
    console.error(message, error, `{ ${serializedContext} }`);
  } else {
    console.error(message, error);
  }

  // Send to Sentry in production
  if (!isDevelopment) {
    // Fire and forget - don't await to avoid blocking
    import('@sentry/nuxt')
      .then((Sentry) => {
        // Ensure Sentry is initialized with DSN before capturing
        // The module might have initialized without DSN if env vars weren't loaded at build time
        const currentClient = Sentry.getClient?.();
        const hasDsn = currentClient?.getDsn?.();
        const sentryDsn = process.env.SENTRY_DSN || '';

        // If client exists but has no DSN, or no client exists, initialize manually
        if ((!currentClient || !hasDsn) && sentryDsn && sentryDsn.trim() !== '' && typeof Sentry.init === 'function') {
          Sentry.init({
            dsn: sentryDsn,
            enabled: true,
            environment: process.env.NODE_ENV || 'production',
            tracesSampleRate: 0.1,
            enableLogs: false,
            sendDefaultPii: false,
          });
        }

        const errorToCapture =
          error instanceof Error ? error : new Error(String(error));

        Sentry.captureException(errorToCapture, {
          tags: {
            feature: featureName,
          },
          extra: {
            message,
            ...context,
          },
        });
      })
      .catch((sentryError) => {
        // If Sentry is not available, just log the error
        console.error('[Logger] Failed to send error to Sentry:', sentryError);
      });
  }
};

/**
 * @deprecated Use logWarn instead
 * Legacy function for backward compatibility
 */
export const devWarn = (...args: unknown[]) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

/**
 * @deprecated Use logError instead
 * Legacy function for backward compatibility
 */
export const devError = (...args: unknown[]) => {
  if (isDevelopment) {
    console.error(...args);
  }
};

/**
 * @deprecated Use logError instead
 * Legacy function for backward compatibility
 */
export const safeError = (
  message: string,
  error: unknown,
  sensitiveData?: Record<string, unknown>
) => {
  logError(message, error, sensitiveData);
};
