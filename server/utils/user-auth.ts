import type { H3Event } from 'h3';

/**
 * Extract userId from event (Bearer token ONLY)
 * Used by server endpoints to get authenticated user ID
 *
 * IMPORTANT: This function ONLY accepts Authorization: Bearer tokens.
 * APIs use token-based auth, pages use cookie-based auth (separate systems).
 */
export async function getUserIdFromEvent(
  event: H3Event
): Promise<string | null> {
  const authHeader = event.node.req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString());

    return payload.sub ?? null;
  } catch {
    return null;
  }
}

