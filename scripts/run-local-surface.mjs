import { spawn } from "node:child_process";

const [surface, portValue] = process.argv.slice(2);
const allowedSurfaces = new Set(["pos", "it_admin"]);
const port = Number(portValue);

if (!allowedSurfaces.has(surface)) {
  console.error(`[surface-dev] Unsupported APP_SURFACE: ${surface ?? "(missing)"}`);
  process.exit(1);
}

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`[surface-dev] Invalid port: ${portValue ?? "(missing)"}`);
  process.exit(1);
}

const label = surface === "it_admin" ? "SSTiPOS Support" : "POS";
const path = surface === "it_admin" ? "/it-admin" : "/preview/pos";
const command = process.platform === "win32" ? "cmd.exe" : "corepack";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "corepack pnpm --filter backoffice-web dev"]
    : ["pnpm", "--filter", "backoffice-web", "dev"];

console.log(`[surface-dev] ${label}: http://localhost:${port}${path}`);
console.log(`[surface-dev] APP_SURFACE=${surface}`);

const child = spawn(command, args, {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    APP_SURFACE: surface,
    PORT: String(port)
  }
});

child.on("error", (error) => {
  console.error(`[surface-dev] Failed to start ${label}: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
