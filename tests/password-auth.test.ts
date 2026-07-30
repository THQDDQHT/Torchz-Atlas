import { describe, expect, it } from "vitest";
import {
  LoginRateLimiter,
  createSessionToken,
  deriveSessionKey,
  matchesPassword,
  sessionCookie,
  verifySessionToken,
} from "@/lib/password-auth.mjs";

describe("密码鉴权基础能力", () => {
  it("使用定时安全比较校验密码", () => {
    expect(matchesPassword("正确密码", "正确密码")).toBe(true);
    expect(matchesPassword("错误密码", "正确密码")).toBe(false);
  });

  it("签发可验证且会过期的会话", () => {
    const key = deriveSessionKey("正确密码");
    const now = Date.UTC(2026, 6, 30);
    const token = createSessionToken(key, now, 60);

    expect(verifySessionToken(token, key, now + 59_000)).toBe(true);
    expect(verifySessionToken(token, key, now + 61_000)).toBe(false);
    expect(verifySessionToken(`${token}x`, key, now)).toBe(false);
    expect(verifySessionToken(token, deriveSessionKey("另一个密码"), now)).toBe(false);
  });

  it("生产 Cookie 默认包含安全属性", () => {
    expect(sessionCookie("token")).toContain("HttpOnly");
    expect(sessionCookie("token")).toContain("SameSite=Lax");
    expect(sessionCookie("token")).toContain("Secure");
    expect(sessionCookie("token")).toContain("Max-Age=");
  });

  it("连续失败达到阈值后限速，成功后可重置", () => {
    const limiter = new LoginRateLimiter({ limit: 2, windowMs: 60_000, blockMs: 30_000 });
    const now = Date.UTC(2026, 6, 30);

    limiter.recordFailure("client", now);
    expect(limiter.retryAfter("client", now)).toBe(0);
    limiter.recordFailure("client", now + 1);
    expect(limiter.retryAfter("client", now + 1)).toBe(30);
    limiter.reset("client");
    expect(limiter.retryAfter("client", now + 1)).toBe(0);
  });
});
