export const SESSION_COOKIE: string;
export const SESSION_MAX_AGE_SECONDS: number;

export function deriveSessionKey(password: string): Buffer;
export function matchesPassword(candidate: string, expected: string): boolean;
export function createSessionToken(
  key: Buffer,
  now?: number,
  maxAgeSeconds?: number,
): string;
export function verifySessionToken(
  token: string | undefined,
  key: Buffer,
  now?: number,
): boolean;
export function cookieValue(header: string | undefined, name: string): string | undefined;
export function sessionCookie(token: string, secure?: boolean): string;

export class LoginRateLimiter {
  constructor(options?: { limit?: number; windowMs?: number; blockMs?: number });
  retryAfter(key: string, now?: number): number;
  recordFailure(key: string, now?: number): void;
  reset(key: string): void;
}
