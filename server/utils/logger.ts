/**
 * Logger utility that only logs in development
 * Prevents sensitive information from being logged in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const devLog = (...args: unknown[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

export const devError = (...args: unknown[]) => {
  if (isDevelopment) {
    console.error(...args);
  }
};

export const devWarn = (...args: unknown[]) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

/**
 * Safe error logging - always logs errors but sanitizes sensitive data in production
 */
export const safeError = (
  message: string,
  error: unknown,
  sensitiveData?: Record<string, unknown>
) => {
  if (isDevelopment) {
    console.error(message, error, sensitiveData);
  } else {
    // In production, only log the message and error type, not sensitive data
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(message, errorMessage);
  }
};
