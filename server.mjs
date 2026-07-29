import "dotenv/config";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { lookup as mimeType } from "mime-types";
import { createRemoteJWKSet, jwtVerify } from "jose";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const siteDirectory = path.resolve(process.env.SITE_DIR || ".vitepress/dist");

let jwks = null;
let jwksTeam = null;

function environment(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function deny(response, message, status = 403) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(message);
}

function getJwks(teamDomain) {
  if (jwks && jwksTeam === teamDomain) return jwks;
  jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
  jwksTeam = teamDomain;
  return jwks;
}

function cookieValue(header, name) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

async function authorize(request, response) {
  const mode = environment("AUTH_MODE") || "cf-access";

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
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl || "/", "http://localhost").pathname);
  } catch {
    return null;
  }

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
  console.log(`Torchz Atlas listening on http://${hostname}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
