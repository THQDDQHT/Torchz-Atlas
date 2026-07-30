import "dotenv/config";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { lookup as mimeType } from "mime-types";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  LoginRateLimiter,
  SESSION_COOKIE,
  cookieValue,
  createSessionToken,
  deriveSessionKey,
  matchesPassword,
  sessionCookie,
  verifySessionToken,
} from "./lib/password-auth.mjs";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const siteDirectory = path.resolve(process.env.SITE_DIR || ".vitepress/dist");

let jwks = null;
let jwksTeam = null;
let cachedPassword = null;
let cachedSessionKey = null;
const loginRateLimiter = new LoginRateLimiter();

function environment(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function authenticationMode() {
  return environment("AUTH_MODE") || "password";
}

function requestPathname(requestUrl) {
  try {
    return decodeURIComponent(
      new URL(requestUrl || "/", "http://localhost").pathname,
    );
  } catch {
    return null;
  }
}

function deny(response, message, status = 403) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(message);
}

function redirect(response, location) {
  response.writeHead(303, {
    location,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end();
}

function getJwks(teamDomain) {
  if (jwks && jwksTeam === teamDomain) return jwks;
  jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
  jwksTeam = teamDomain;
  return jwks;
}

function passwordConfiguration() {
  const password = process.env.AUTH_PASSWORD;
  if (!password || !password.trim()) return null;
  if (password !== cachedPassword) {
    cachedPassword = password;
    cachedSessionKey = deriveSessionKey(password);
  }
  return { password, sessionKey: cachedSessionKey };
}

function loginPage(message = "") {
  const alert = message
    ? `<p class="notice" role="alert">${message}</p>`
    : '<p class="hint">登录后将在这台设备上保持 30 天。</p>';

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>登录 | Torchz Atlas</title>
  <style>
    :root { color-scheme: light dark; --accent:#3451b2; --bg:#fff; --surface:#f6f6f7; --text:#3c3c43; --muted:#67676c; --divider:#e2e2e3; --danger:#b42318; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; background:var(--bg); color:var(--text); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; }
    header { height:64px; border-bottom:1px solid var(--divider); display:flex; align-items:center; gap:10px; padding:0 24px; font-weight:600; }
    .mark { width:10px; height:10px; border-radius:4px; background:var(--accent); }
    main { width:min(100% - 40px, 380px); margin:0 auto; padding:clamp(72px,14vh,128px) 0 48px; }
    h1 { margin:0 0 12px; font-size:28px; line-height:1.25; letter-spacing:-.02em; }
    .intro { margin:0 0 32px; color:var(--muted); line-height:1.7; }
    label { display:block; margin-bottom:8px; font-size:14px; font-weight:600; }
    input { width:100%; height:44px; border:1px solid var(--divider); border-radius:8px; padding:0 12px; background:var(--bg); color:var(--text); font:inherit; outline:none; transition:border-color 0.15s ease, box-shadow 0.15s ease; }
    input:focus { border-color:var(--accent); box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent); }
    button { width:100%; height:44px; margin-top:16px; border:0; border-radius:8px; background:var(--accent); color:#fff; font:600 15px/1 inherit; cursor:pointer; transition:filter 0.15s ease, transform 0.1s ease; }
    button:hover { filter:brightness(1.08); }
    button:active { transform:scale(0.98); }
    button:focus-visible { outline:3px solid color-mix(in srgb,var(--accent) 32%,transparent); outline-offset:3px; }
    .hint,.notice { margin:14px 0 0; font-size:13px; line-height:1.6; }
    .hint { color:var(--muted); }
    .notice { color:var(--danger); }
    @media (prefers-color-scheme:dark) {
      :root { --accent:#9eb1ff; --bg:#1b1b1f; --surface:#202127; --text:#dfdfd6; --muted:#a8a8a3; --divider:#3c3f44; --danger:#ffb4ab; }
      button { background:#8297ef; color:#16171c; }
    }
  </style>
</head>
<body>
  <header><span class="mark"></span>Torchz Atlas</header>
  <main>
    <h1>输入访问密码</h1>
    <p class="intro">这是一个私人知识库。</p>
    <form method="post" action="/login">
      <label for="password">密码</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      <button type="submit">进入知识库</button>
    </form>
    ${alert}
  </main>
</body>
</html>`;
}

function loginHeaders(status, body) {
  return {
    "content-type": "text/html; charset=utf-8",
    "content-length": String(Buffer.byteLength(body)),
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    status,
  };
}

function sendLoginPage(response, message = "", status = 200, headOnly = false) {
  const body = loginPage(message);
  const { status: responseStatus, ...headers } = loginHeaders(status, body);
  response.writeHead(responseStatus, headers);
  response.end(headOnly ? undefined : body);
}

async function readForm(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 4096) throw new Error("FORM_TOO_LARGE");
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

function clientKey(request) {
  const forwarded = request.headers["cf-connecting-ip"];
  return (
    (Array.isArray(forwarded) ? forwarded[0] : forwarded) ||
    request.socket.remoteAddress ||
    "unknown"
  );
}

async function handlePasswordLogin(request, response) {
  const configuration = passwordConfiguration();
  if (!configuration) {
    deny(response, "密码鉴权未配置完整。", 503);
    return;
  }

  const existingToken = cookieValue(request.headers.cookie, SESSION_COOKIE);
  if (
    request.method !== "POST" &&
    verifySessionToken(existingToken, configuration.sessionKey)
  ) {
    redirect(response, "/");
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    sendLoginPage(response, "", 200, request.method === "HEAD");
    return;
  }
  if (request.method !== "POST") {
    deny(response, "不支持的请求方法。", 405);
    return;
  }

  const key = clientKey(request);
  const retryAfter = loginRateLimiter.retryAfter(key);
  if (retryAfter > 0) {
    const body = loginPage("尝试次数过多，请稍后再试。");
    const { status, ...headers } = loginHeaders(429, body);
    response.writeHead(status, { ...headers, "retry-after": String(retryAfter) });
    response.end(body);
    return;
  }

  let form;
  try {
    form = await readForm(request);
  } catch {
    deny(response, "登录请求过大。", 413);
    return;
  }

  if (!matchesPassword(form.get("password") || "", configuration.password)) {
    loginRateLimiter.recordFailure(key);
    sendLoginPage(response, "密码不正确，请重新输入。", 401);
    return;
  }

  loginRateLimiter.reset(key);
  const secureCookie = environment("AUTH_COOKIE_SECURE") !== "false";
  response.writeHead(303, {
    location: "/",
    "set-cookie": sessionCookie(
      createSessionToken(configuration.sessionKey),
      secureCookie,
    ),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end();
}

async function authorize(request, response) {
  const mode = authenticationMode();

  if (mode === "none") {
    if (environment("ALLOW_INSECURE_AUTH") !== "true") {
      deny(
        response,
        "AUTH_MODE=none 需要同时设置 ALLOW_INSECURE_AUTH=true 才能生效。",
        503,
      );
      return false;
    }
    return true;
  }

  if (mode === "password") {
    const configuration = passwordConfiguration();
    if (!configuration) {
      deny(response, "密码鉴权未配置完整。", 503);
      return false;
    }
    const token = cookieValue(request.headers.cookie, SESSION_COOKIE);
    if (!verifySessionToken(token, configuration.sessionKey)) {
      redirect(response, "/login");
      return false;
    }
    return true;
  }

  if (mode !== "cf-access") {
    deny(response, "未知的鉴权模式。", 503);
    return false;
  }

  const teamDomain = environment("CF_ACCESS_TEAM_DOMAIN");
  const audience = environment("CF_ACCESS_AUD");
  if (!teamDomain || !audience) {
    deny(response, "鉴权未配置完整。", 503);
    return false;
  }

  const assertionHeader = request.headers["cf-access-jwt-assertion"];
  const token =
    (Array.isArray(assertionHeader) ? assertionHeader[0] : assertionHeader) ||
    cookieValue(request.headers.cookie, "CF_Authorization");

  if (!token) {
    deny(response, "缺少 Cloudflare Access 身份凭证。");
    return false;
  }

  try {
    await jwtVerify(token, getJwks(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience,
    });
    return true;
  } catch {
    deny(response, "Cloudflare Access 身份校验未通过。");
    return false;
  }
}

function responseHeaders(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    "content-type": `${mimeType(extension) || "application/octet-stream"}${
      extension === ".html" || extension === ".css" || extension === ".js"
        ? "; charset=utf-8"
        : ""
    }`,
    "cache-control": "private, no-store",
    "content-security-policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

async function resolveFile(requestUrl) {
  const pathname = requestPathname(requestUrl);
  if (pathname === null) return null;

  if (pathname.includes("\0")) return null;

  const relative = pathname.replace(/^\/+/, "");
  const candidates =
    relative === ""
      ? ["index.html"]
      : relative.endsWith("/")
        ? [path.join(relative, "index.html")]
        : [relative, `${relative}.html`, path.join(relative, "index.html")];

  for (const candidate of candidates) {
    const absolute = path.resolve(siteDirectory, candidate);
    if (absolute !== siteDirectory && !absolute.startsWith(`${siteDirectory}${path.sep}`)) {
      continue;
    }

    try {
      const stat = await fs.stat(absolute);
      if (stat.isFile()) return { absolute, size: stat.size };
    } catch {
      // Try the next clean-URL candidate.
    }
  }

  return null;
}

const server = http.createServer(async (request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end('{"status":"ok"}');
    return;
  }

  const pathname = requestPathname(request.url);
  if (pathname === null) {
    deny(response, "请求地址无效。", 400);
    return;
  }
  if (pathname === "/login" && authenticationMode() === "password") {
    await handlePasswordLogin(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    deny(response, "不支持的请求方法。", 405);
    return;
  }

  if (!(await authorize(request, response))) return;

  const file = await resolveFile(request.url);
  if (!file) {
    const notFound = path.join(siteDirectory, "404.html");
    try {
      const body = await fs.readFile(notFound);
      response.writeHead(404, responseHeaders(notFound));
      if (request.method === "HEAD") response.end();
      else response.end(body);
    } catch {
      deny(response, "没有找到这个页面。", 404);
    }
    return;
  }

  try {
    const body = await fs.readFile(file.absolute);
    response.writeHead(200, {
      ...responseHeaders(file.absolute),
      "content-length": String(file.size),
    });
    if (request.method === "HEAD") response.end();
    else response.end(body);
  } catch {
    deny(response, "读取页面失败。", 500);
  }
});

server.listen(port, hostname, () => {
  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : port;
  console.log(`Torchz Atlas listening on http://${hostname}:${boundPort}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
