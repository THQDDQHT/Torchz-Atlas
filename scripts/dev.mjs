import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chokidar from "chokidar";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const knowledgeDir = path.resolve(process.env.KNOWLEDGE_DIR || "/knowledge");
const vitepressBin = path.join(projectRoot, "node_modules", "vitepress", "bin", "vitepress.js");

let child;
let restartTimer;
let stopping = false;

function start() {
  child = spawn(process.execPath, [vitepressBin, "dev", projectRoot], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });

  child.once("exit", (code, signal) => {
    if (!stopping && code && signal === null) process.exitCode = code;
  });
}

function restart() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (!child || child.exitCode !== null) {
      start();
      return;
    }

    child.once("exit", start);
    child.kill("SIGTERM");
  }, 300);
}

const watcher = chokidar.watch(knowledgeDir, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
});
watcher.on("all", restart);
start();

async function shutdown() {
  stopping = true;
  clearTimeout(restartTimer);
  await watcher.close();
  if (child && child.exitCode === null) child.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
