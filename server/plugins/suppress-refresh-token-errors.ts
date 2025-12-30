/**
 * Server plugin to suppress expected refresh token errors
 * These errors occur when Supabase tries to refresh tokens that don't exist or are invalid
 * They're expected and don't need to be logged as errors
 */
export default defineNitroPlugin(() => {
  if (import.meta.server && process.env.NODE_ENV === 'development') {
    // Intercept console.error to filter out refresh token errors
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      // Check if any argument contains refresh token error messages
      const hasRefreshTokenError = args.some((arg) => {
        const message =
          arg instanceof Error
            ? arg.message
            : typeof arg === 'string'
              ? arg
              : String(arg);
        return (
          message.includes('Refresh Token') ||
          message.includes('refresh_token') ||
          message.includes('Invalid Refresh Token') ||
          message.includes('Refresh Token Not Found')
        );
      });

      // Skip logging if it's a refresh token error
      if (hasRefreshTokenError) {
        return;
      }

      // For other errors, log normally
      originalConsoleError.apply(console, args);
    };

    // Also handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      const errorMessage =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : String(reason);

      const isRefreshTokenError =
        errorMessage.includes('Refresh Token') ||
        errorMessage.includes('refresh_token') ||
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('Refresh Token Not Found');

      if (isRefreshTokenError) {
        // Silently ignore - this is expected when tokens are invalid/expired
        return;
      }
    });

    return {
      provide: {
        suppressRefreshTokenErrors: true,
      },
    };
  }
});
