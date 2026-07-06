import { spawn, spawnSync } from "node:child_process";

process.loadEnvFile?.();
process.env.RESEND_API_KEY ??= "dev-placeholder";

const children = [];

runStep("docker", ["compose", "up", "-d", "mariadb"]);
runStep("npm", ["run", "prisma:deploy"]);

const api = spawnProcess("npm", ["run", "dev:api"]);
const web = spawnProcess("npm", ["run", "dev:web"]);

registerShutdown();

api.on("exit", (code) => stopAll(code ?? 0));
web.on("exit", (code) => stopAll(code ?? 0));

function runStep(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv },
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function spawnProcess(command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
  children.push(child);
  return child;
}

function registerShutdown() {
  ["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => {
    process.on(signal, () => stopAll(0));
  });
}

let shuttingDown = false;

function stopAll(exitCode) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  children.forEach((child) => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  });
  setTimeout(() => process.exit(exitCode), 150);
}
