import { execSync, spawn } from "node:child_process";

function readPort() {
  const raw = String(process.env.PORT ?? "3000").trim();
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) return 3000;
  return parsed;
}

function listListeningPidsOnWindows(port) {
  try {
    const output = execSync("netstat -ano -p tcp", { encoding: "utf8" });
    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      if (!line.includes(`:${port}`)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (Number.isInteger(pid) && pid > 0) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function listListeningPidsOnUnix(port) {
  try {
    const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: "utf8" });
    return output
      .split(/\r?\n/)
      .map((row) => Number(row.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /T /F /PID ${pid}`, { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGKILL");
    }
    return true;
  } catch {
    return false;
  }
}

function clearPortIfBusy(port) {
  const pids =
    process.platform === "win32"
      ? listListeningPidsOnWindows(port)
      : listListeningPidsOnUnix(port);

  const uniquePids = [...new Set(pids)].filter((pid) => pid !== process.pid);
  if (uniquePids.length === 0) return { occupied: false, remainingPids: [] };

  console.log(`[dev-safe] Port ${port} is busy. Cleaning ${uniquePids.length} process(es): ${uniquePids.join(", ")}`);
  for (const pid of uniquePids) {
    const killed = killPid(pid);
    console.log(`[dev-safe] ${killed ? "Killed" : "Failed to kill"} PID ${pid}`);
  }

  const remainingPids =
    process.platform === "win32"
      ? listListeningPidsOnWindows(port).filter((pid) => pid !== process.pid)
      : listListeningPidsOnUnix(port).filter((pid) => pid !== process.pid);

  return { occupied: true, remainingPids };
}

const port = readPort();
const portResult = clearPortIfBusy(port);

if (portResult?.remainingPids?.length) {
  console.log(
    `[dev-safe] Port ${port} is already serving from PID(s): ${portResult.remainingPids.join(", ")}. Reusing existing server.`
  );
  process.exit(0);
}

const child =
  process.platform === "win32"
    ? spawn("cmd.exe", ["/c", "next", "dev", "-p", String(port), "--webpack"], {
        stdio: "inherit",
        shell: false,
        env: process.env
      })
    : spawn("next", ["dev", "-p", String(port), "--webpack"], {
        stdio: "inherit",
        shell: false,
        env: process.env
      });

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
