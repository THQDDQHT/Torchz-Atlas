import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface RunningServer {
  baseUrl: string;
  child: ChildProcess;
  siteDirectory: string;
}

async function startServer(overrides: Record<string, string> = {}): Promise<RunningServer> {
  const siteDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "torchz-atlas-server-"));
  await fs.mkdir(path.join(siteDirectory, "assets"));
  await fs.writeFile(path.join(siteDirectory, "index.html"), "<h1>私密正文</h1>", "utf8");
  await fs.writeFile(path.join(siteDirectory, "404.html"), "<h1>没有找到</h1>", "utf8");
  await fs.writeFile(path.join(siteDirectory, "assets", "app.js"), "export {};", "utf8");

  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: "0",
      SITE_DIR: siteDirectory,
      AUTH_MODE: "password",
      AUTH_PASSWORD: "一条足够长的测试密码",
      AUTH_COOKIE_SECURE: "false",
      ...overrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const baseUrl = await new Promise<string>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => reject(new Error(`服务器启动超时：${stderr}`)), 10_000);

    child.stdout!.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      const match = stdout.match(/listening on http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(`http://127.0.0.1:${match[1]}`);
      }
    });
    child.stderr!.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`服务器提前退出（${code}）：${stderr}`));
    });
  });

  return { baseUrl, child, siteDirectory };
}

async function stopServer(server: RunningServer): Promise<void> {
  if (server.child.exitCode === null) {
    server.child.kill("SIGTERM");
    await new Promise<void>((resolve) => server.child.once("exit", () => resolve()));
  }
  await fs.rm(server.siteDirectory, { recursive: true, force: true });
}

async function rawHttpRequest(baseUrl: string, target: string): Promise<string> {
  const { hostname, port } = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    let response = "";
    const socket = net.createConnection({ host: hostname, port: Number(port) });
    socket.setEncoding("utf8");
    socket.on("connect", () => {
      socket.end(
        `GET ${target} HTTP/1.1\r\nHost: ${hostname}\r\nConnection: close\r\n\r\n`,
      );
    });
    socket.on("data", (chunk) => {
      response += chunk;
    });
    socket.on("end", () => resolve(response));
    socket.on("error", reject);
  });
}

let running: RunningServer;

beforeAll(async () => {
  running = await startServer();
});

afterAll(async () => {
  await stopServer(running);
});

describe("密码模式静态服务器", () => {
  it("健康检查免登录，正文和静态资源需要登录", async () => {
    expect((await fetch(`${running.baseUrl}/healthz`)).status).toBe(200);

    const page = await fetch(`${running.baseUrl}/`, { redirect: "manual" });
    expect(page.status).toBe(303);
    expect(page.headers.get("location")).toBe("/login");

    const asset = await fetch(`${running.baseUrl}/assets/app.js`, { redirect: "manual" });
    expect(asset.status).toBe(303);
    expect(asset.headers.get("location")).toBe("/login");
  });

  it("登录页不泄露环境变量中的密码", async () => {
    const response = await fetch(`${running.baseUrl}/login`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("输入访问密码");
    expect(body).not.toContain("一条足够长的测试密码");
  });

  it("错误密码被拒绝，正确密码签发安全会话", async () => {
    const wrong = await fetch(`${running.baseUrl}/login`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password: "错误密码" }),
    });
    expect(wrong.status).toBe(401);

    const correct = await fetch(`${running.baseUrl}/login`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password: "一条足够长的测试密码" }),
    });
    const cookie = correct.headers.get("set-cookie");
    expect(correct.status).toBe(303);
    expect(correct.headers.get("location")).toBe("/");
    expect(cookie).toContain("atlas_session=");
    expect(cookie).toContain("HttpOnly");

    const authorized = await fetch(`${running.baseUrl}/`, {
      headers: { cookie: cookie!.split(";")[0] },
    });
    expect(authorized.status).toBe(200);
    expect(await authorized.text()).toContain("私密正文");
  });

  it("缺少密码时失败关闭", async () => {
    const server = await startServer({ AUTH_PASSWORD: "" });
    try {
      const response = await fetch(`${server.baseUrl}/`, { redirect: "manual" });
      expect(response.status).toBe(503);
    } finally {
      await stopServer(server);
    }
  });

  it("无效请求地址返回 400，且不会终止服务进程", async () => {
    const response = await rawHttpRequest(running.baseUrl, "http://[");
    expect(response).toMatch(/^HTTP\/1\.1 400 /);
    expect((await fetch(`${running.baseUrl}/healthz`)).status).toBe(200);
  });

  it("密码会保留 env 中的首尾空格", async () => {
    const server = await startServer({ AUTH_PASSWORD: " 前后有空格 " });
    try {
      const trimmed = await fetch(`${server.baseUrl}/login`, {
        method: "POST",
        redirect: "manual",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ password: "前后有空格" }),
      });
      expect(trimmed.status).toBe(401);

      const exact = await fetch(`${server.baseUrl}/login`, {
        method: "POST",
        redirect: "manual",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ password: " 前后有空格 " }),
      });
      expect(exact.status).toBe(303);
    } finally {
      await stopServer(server);
    }
  });
});
