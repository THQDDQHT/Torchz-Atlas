import "dotenv/config";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chokidar from "chokidar";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const knowledgeDir = path.resolve(process.env.KNOWLEDGE_DIR || "/knowledge");
const siteRoot = path.resolve(process.env.SITE_ROOT || "/site");
const sourceDir = path.resolve(process.env.SITE_SOURCE_DIR || "/tmp/torchz-atlas-source");
const cacheDir = path.resolve(process.env.VITEPRESS_CACHE_DIR || "/tmp/torchz-atlas-cache");
const currentLink = path.join(siteRoot, "current");
const vitepressBin = path.join(projectRoot, "node_modules", "vitepress", "bin", "vitepress.js");

let building = false;
let dirty = false;
let buildTimer;
let serverProcess;
let stopping = false;

async function runBuild(outputDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [vitepressBin, "build", projectRoot], {
      cwd: projectRoot,
      env: {
        ...process.env,
        SITE_SOURCE_DIR: sourceDir,
        SITE_OUT_DIR: outputDirectory,
        VITEPRESS_CACHE_DIR: cacheDir,
      },
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`VitePress 构建失败（code=${code}, signal=${signal}）`));
    });
  });
}

async function activateRelease(releaseDirectory) {
  const nextLink = path.join(siteRoot, `.current-${process.pid}`);
  await fs.rm(nextLink, { force: true });
  await fs.symlink(releaseDirectory, nextLink);
  await fs.rename(nextLink, currentLink);
}

async function cleanupReleases(activeDirectory) {
  const releasesDirectory = path.join(siteRoot, "releases");
  const entries = await fs.readdir(releasesDirectory, { withFileTypes: true });
  const stale = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(releasesDirectory, entry.name))
    .filter((directory) => directory !== activeDirectory)
    .sort()
    .slice(0, -1);

  for (const directory of stale) {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function buildAndActivate() {
  if (building) {
    dirty = true;
    return;
  }

  building = true;
  dirty = false;
  const releaseDirectory = path.join(
    siteRoot,
    "releases",
    `${Date.now()}-${process.pid}`,
  );

  try {
    await fs.mkdir(path.dirname(releaseDirectory), { recursive: true });
    await runBuild(releaseDirectory);
    await activateRelease(releaseDirectory);
    await cleanupReleases(releaseDirectory);
    console.log(`Activated VitePress release ${path.basename(releaseDirectory)}`);
  } catch (error) {
    await fs.rm(releaseDirectory, { recursive: true, force: true });
    console.error(error);
    if (!serverProcess) throw error;
    console.error("继续提供上一个成功版本。");
  } finally {
    building = false;
  }

  if (dirty && !stopping) await buildAndActivate();
}

function scheduleBuild() {
  dirty = true;
  clearTimeout(buildTimer);
  buildTimer = setTimeout(() => {
    buildAndActivate().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  }, 500);
}

const watcher = chokidar.watch(knowledgeDir, {
  ignoreInitial: true,
  // 容器挂载目录与 macOS 的文件监听上限都更适合轮询；这里只扫描 Markdown 知识库。
  usePolling: true,
  interval: 500,
  awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 75 },
});
watcher.on("all", scheduleBuild);
await new Promise((resolve) => watcher.once("ready", resolve));

await fs.mkdir(siteRoot, { recursive: true });
await buildAndActivate();

serverProcess = spawn(process.execPath, [path.join(projectRoot, "server.mjs")], {
  cwd: projectRoot,
  env: { ...process.env, SITE_DIR: currentLink },
  stdio: "inherit",
});

async function shutdown() {
  stopping = true;
  clearTimeout(buildTimer);
  await watcher.close();
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill("SIGTERM");
}

serverProcess.once("exit", (code) => {
  if (!stopping) process.exit(code ?? 1);
});
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
