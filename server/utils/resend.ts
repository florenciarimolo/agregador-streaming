/**
 * Resend email service utilities for server-side operations
 * Centralized to avoid code duplication across API endpoints
 *
 * @example
 * // In a server API endpoint (server/api/example.post.ts):
 * import { sendEmail } from '~/server/utils/resend';
 *
 * export default defineEventHandler(async (event) => {
 *   const config = useRuntimeConfig();
 *
 *   try {
 *     const result = await sendEmail(config, {
 *       from: 'noreply@yourdomain.com',
 *       to: 'user@example.com',
 *       subject: 'Welcome!',
 *       html: '<h1>Welcome to UpNext!</h1>',
 *     });
 *     return { success: true, id: result.data?.id };
 *   } catch (error) {
 *     throw createError({
 *       statusCode: 500,
 *       message: 'Failed to send email',
 *     });
 *   }
 * });
 */

import { Resend } from 'resend';

/**
 * Create a Resend client for server-side operations
 * @param config Runtime config (from useRuntimeConfig())
 * @returns Resend client configured for server-side use
 * @throws Error if RESEND_API_KEY is not configured
 */
export function createResendClient(
  config: ReturnType<typeof useRuntimeConfig>
) {
  const apiKey = config.resendApiKey || process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Resend API key not found. Please set RESEND_API_KEY environment variable.'
    );
  }

  return new Resend(apiKey);
}

/**
 * Send an email using Resend
 * @param config Runtime config (from useRuntimeConfig())
 * @param options Email options (from, to, subject, html/text)
 * @returns Promise with the email result
 */
export async function sendEmail(
  config: ReturnType<typeof useRuntimeConfig>,
  options: {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
  }
) {
  const resend = createResendClient(config);

  return await resend.emails.send({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

