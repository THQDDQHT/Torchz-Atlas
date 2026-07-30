import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "atlas_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const SESSION_SALT = "torchz-atlas/session/v1";
const PASSWORD_COMPARE_KEY = "torchz-atlas/password-compare/v1";

function digest(value) {
  return createHmac("sha256", PASSWORD_COMPARE_KEY).update(value, "utf8").digest();
}

function signature(value, key) {
  return createHmac("sha256", key).update(value, "utf8").digest("base64url");
}

function equalText(left, right) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function deriveSessionKey(password) {
  return scryptSync(password, SESSION_SALT, 32);
}

export function matchesPassword(candidate, expected) {
  return timingSafeEqual(digest(candidate), digest(expected));
}

export function createSessionToken(
  key,
  now = Date.now(),
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS,
) {
  const expiresAt = Math.floor(now / 1000) + maxAgeSeconds;
  const payload = expiresAt.toString(36);
  return `${payload}.${signature(payload, key)}`;
}

export function verifySessionToken(token, key, now = Date.now()) {
  if (!token) return false;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra !== undefined) return false;
  if (!equalText(signature(payload, key), suppliedSignature)) return false;

  const expiresAt = Number.parseInt(payload, 36);
  return Number.isSafeInteger(expiresAt) && expiresAt >= Math.floor(now / 1000);
}

export function cookieValue(header, name) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

export function sessionCookie(token, secure = true) {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export class LoginRateLimiter {
  constructor({ limit = 5, windowMs = 15 * 60_000, blockMs = 15 * 60_000 } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.blockMs = blockMs;
    this.entries = new Map();
  }

  retryAfter(key, now = Date.now()) {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    if (entry.blockedUntil > now) {
      return Math.ceil((entry.blockedUntil - now) / 1000);
    }
    if (now - entry.windowStartedAt >= this.windowMs) {
      this.entries.delete(key);
    }
    return 0;
  }

  recordFailure(key, now = Date.now()) {
    const existing = this.entries.get(key);
    const entry =
      !existing || now - existing.windowStartedAt >= this.windowMs
        ? { failures: 0, windowStartedAt: now, blockedUntil: 0 }
        : existing;

    entry.failures += 1;
    if (entry.failures >= this.limit) entry.blockedUntil = now + this.blockMs;
    this.entries.set(key, entry);
  }

  reset(key) {
    this.entries.delete(key);
  }
}
