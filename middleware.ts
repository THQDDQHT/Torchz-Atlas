/**
 * 访问控制：应用层的第二道锁。
 *
 * 第一道锁是 Cloudflare Access（在 Tunnel 前拦截未认证请求）。这里再验一次它签发的
 * JWT，是为了让"有人绕过 Tunnel 直连端口"和"Access 策略被误删/误配"这两种情况
 * 同样打不开笔记 —— 私有知识库不该把全部信任押在一层配置上。
 *
 * 跑在 Node.js runtime 而不是默认的 Edge：Edge middleware 的 process.env 会在构建时
 * 被内联成字面量，那样 docker compose 里传的 AUD 根本不会生效，鉴权会静默失效。
 */

import { NextResponse, type NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export const config = {
  runtime: "nodejs",
  // /healthz 免鉴权：部署检查必须在没有身份的情况下也能确认服务活着，且它不返回任何笔记内容
  matcher: ["/((?!_next/static|_next/image|favicon.ico|healthz).*)"],
};

/**
 * 方括号访问而非 process.env.FOO：点号形式会被打包器的常量替换命中，
 * 那正是我们要避开的构建时内联。
 */
function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

let jwks: JWTVerifyGetKey | null = null;
let jwksTeam: string | null = null;

function getJwks(teamDomain: string): JWTVerifyGetKey {
  if (jwks && jwksTeam === teamDomain) return jwks;
  jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
  jwksTeam = teamDomain;
  return jwks;
}

function deny(reason: string, status = 403): NextResponse {
  // 只回最小信息：不暴露配置细节，也不暴露笔记是否存在
  return new NextResponse(reason, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * CSP 必须在这里逐请求生成，而不是写死在 next.config 里。
 *
 * App Router 用内联 `<script>self.__next_f.push(...)</script>` 传输 RSC payload，
 * 所以 `script-src 'self'` 会把页面自己的脚本全拦掉、hydration 失败、页面白屏。
 * 正确做法是给每个请求发一个 nonce：Next.js 会从请求头里的 CSP 读出 nonce，
 * 自动打到它生成的每个 script 标签上，笔记正文里的脚本则拿不到 nonce。
 *
 * style-src 保留 unsafe-inline：nonce 对 `style="..."` 属性无效，而分类色点用的是
 * 内联样式。样式注入的危害远小于脚本，且净化管线本就不允许 style 属性进入笔记 HTML。
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    // 允许 https 图片，否则笔记里引用的外链图片一律显示不出来
    "img-src 'self' data: https:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** 鉴权检查：通过返回 null，不通过返回要直接发出的响应 */
async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const mode = env("AUTH_MODE") ?? "cf-access";

  if (mode === "none") {
    // 关掉鉴权必须是一次显式的、写下来的决定，不能靠"忘了改回去"来暴露笔记
    if (env("ALLOW_INSECURE_AUTH") !== "true") {
      return deny(
        "AUTH_MODE=none 需要同时设置 ALLOW_INSECURE_AUTH=true 才能生效。" +
          "该组合仅供本地开发或 SSH 隧道使用，不得用于公网暴露的部署。",
        503,
      );
    }
    return null;
  }

  if (mode !== "cf-access") {
    return deny(`未知的 AUTH_MODE: ${mode}`, 503);
  }

  const teamDomain = env("CF_ACCESS_TEAM_DOMAIN");
  const aud = env("CF_ACCESS_AUD");

  if (!teamDomain || !aud) {
    // 配置缺失时拒绝服务，而不是放行 —— 失败必须是关上门，不是打开门
    return deny("鉴权未配置完整：缺少 CF_ACCESS_TEAM_DOMAIN 或 CF_ACCESS_AUD。", 503);
  }

  const token =
    request.headers.get("cf-access-jwt-assertion") ??
    request.cookies.get("CF_Authorization")?.value;

  if (!token) return deny("缺少 Cloudflare Access 身份凭证。");

  try {
    await jwtVerify(token, getJwks(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience: aud,
    });
  } catch {
    // 不回显具体校验错误：过期、签名不符、AUD 不匹配对访问者应当是同一句话
    return deny("Cloudflare Access 身份校验未通过。");
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const denied = await checkAuth(request);
  if (denied) return denied;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Next.js 从请求头里的 CSP 提取 nonce，用于它自己注入的 script 标签
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
