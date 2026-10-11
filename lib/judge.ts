import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { JudgeResult, JudgeStatus, Language } from "./types";

const MAX_OUTPUT = 64 * 1024;
const RUN_TIMEOUT_MS = 5000;
const COMPILE_TIMEOUT_MS = 20000;

const CODEBOX_LANGUAGE_IDS: Record<Language, number> = {
  c: 50,
  java: 62,
};

type CodeboxResponse = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | number | null;
  status?: { id?: number; description?: string } | number;
};

async function judgeWithCodebox(
  language: Language,
  code: string,
  expected: string
): Promise<JudgeResult> {
  const baseUrl = process.env.CODEBOX_URL?.trim().replace(/\/$/, "");
  const token = process.env.CODEBOX_AUTH_TOKEN?.trim();
  if (!baseUrl || !token) {
    return {
      status: "runtime-unavailable",
      output: "",
      expected,
      stderr: "",
      runtime: "Codebox",
      durationMs: 0,
      message: "Codebox is not configured. Set CODEBOX_URL and CODEBOX_AUTH_TOKEN on the server.",
    };
  }

  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/submissions?wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token,
      },
      body: JSON.stringify({
        source_code: code,
        language_id: CODEBOX_LANGUAGE_IDS[language],
        expected_output: expected,
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      status: timedOut ? "timeout" : "runtime-unavailable",
      output: "",
      expected,
      stderr: error instanceof Error ? error.message : String(error),
      runtime: "Codebox",
      durationMs: Date.now() - started,
      message: timedOut
        ? "Code execution service took too long to respond."
        : "Could not connect to the Codebox execution service.",
    };
  }

  const result = (await response.json().catch(() => null)) as CodeboxResponse | null;
  if (!response.ok || !result) {
    return {
      status: "runtime-unavailable",
      output: "",
      expected,
      stderr: result?.message ?? `Codebox returned HTTP ${response.status}.`,
      runtime: "Codebox",
      durationMs: Date.now() - started,
      message: "The code execution service returned an invalid response.",
    };
  }

  const statusId =
    typeof result.status === "number" ? result.status : result.status?.id;
  const output = result.stdout ?? "";
  const stderr = [result.compile_output, result.stderr, result.message]
    .filter((part): part is string => Boolean(part))
    .join("\n");
  const status =
    statusId === 3 ? "passed" :
    statusId === 4 ? "failed" :
    statusId === 5 ? "timeout" :
    statusId === 13 || statusId === undefined ? "runtime-unavailable" :
    "error";
  const verdict = status === "passed"
    ? { status: "passed" as const, message: "Pattern verified. Output matches the target matrix line-for-line." }
    : status === "failed"
      ? compare(output, expected)
      : null;

  return {
    status: verdict?.status ?? status,
    output,
    expected,
    stderr,
    runtime: `Codebox (${language === "java" ? "Java 17" : "GCC 9"})`,
    durationMs: result.time ? Math.round(Number(result.time) * 1000) || Date.now() - started : Date.now() - started,
    message: verdict?.message ?? (
      status === "timeout" ? "Execution timed out. Check for an infinite loop." :
      status === "runtime-unavailable" ? "Codebox could not process this submission." :
      status === "error" ? "Compilation or runtime error. Check the output for details." :
      "Code execution failed."
    ),
  };
}

interface RunOutcome {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
  durationMs: number;
}

interface Runtime {
  cmd: string;
  argsPrefix: string[];
  label: string;
}

interface JavaRuntime {
  javac: string;
  java: string;
  label: string;
}

interface JudgeStore {
  c?: Runtime | null;
  java?: JavaRuntime | null;
}

const globalStore = globalThis as unknown as JudgeStore;

function minimalEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PATH: process.env.PATH ?? "",
    SYSTEMROOT: process.env.SYSTEMROOT,
    WINDIR: process.env.WINDIR,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    TMPDIR: process.env.TMPDIR,
    PATHEXT: process.env.PATHEXT,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
  };
}

function killTree(pid: number | undefined) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true }).on("error", () => {});
  } else {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already dead
    }
  }
}

function run(cmd: string, args: string[], opts: { cwd?: string; timeoutMs: number }): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const started = Date.now();
    let child;
    try {
      child = spawn(cmd, args, {
        cwd: opts.cwd ?? os.tmpdir(),
        windowsHide: true,
        env: minimalEnv(),
      });
    } catch (err) {
      resolve({
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        code: null,
        timedOut: false,
        durationMs: Date.now() - started,
      });
      return;
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let overflowed = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child.pid);
    }, opts.timeoutMs);

    const finish = (outcome: Omit<RunOutcome, "durationMs">) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...outcome, durationMs: Date.now() - started });
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT) stdout += chunk.toString("utf8");
      if (stdout.length >= MAX_OUTPUT && !overflowed) {
        overflowed = true;
        stdout = stdout.slice(0, MAX_OUTPUT) + "\n[output truncated]";
        killTree(child.pid);
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT) stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      finish({ stdout, stderr: stderr + (stderr ? "\n" : "") + err.message, code: null, timedOut: false });
    });

    child.on("close", (code) => {
      finish({ stdout, stderr, code, timedOut });
    });
  });
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function which(command: string): Promise<string | null> {
  const finder = process.platform === "win32" ? "where" : "which";
  const result = await run(finder, [command], { timeoutMs: 5000 });
  if (result.code === 0 && result.stdout.trim()) {
    return result.stdout.split(/\r?\n/)[0].trim();
  }
  return null;
}

async function globCandidates(pattern: string): Promise<string[]> {
  if (process.platform !== "win32") return [];
  const matches: string[] = [];
  const roots = ["C:\\Program Files", "C:\\Program Files (x86)", os.homedir() + "\\AppData\\Local\\Programs"];
  const re = new RegExp(
    "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^\\\\]*") + "$",
    "i"
  );
  for (const root of roots) {
    try {
      const entries = await fs.readdir(/*turbopackIgnore: true*/ root);
      for (const entry of entries) {
        const candidate = path.join(/*turbopackIgnore: true*/ root, entry);
        if (re.test(candidate)) matches.push(candidate);
      }
    } catch {
      // root missing
    }
  }
  return matches;
}

async function probe(cmd: string, argsPrefix: string[], validator: RegExp, label: string): Promise<Runtime | null> {
  const probeArgs = [...argsPrefix, "--version"];
  const result = await run(cmd, probeArgs, { timeoutMs: 8000 });
  const combined = result.stdout + result.stderr;
  if (result.code === 0 && validator.test(combined)) {
    return { cmd, argsPrefix, label: label || path.basename(cmd) };
  }
  return null;
}

function detectJavaClassName(code: string): string {
  const match = code.match(/public\s+(?:final\s+)?class\s+([A-Za-z_$][\w$]*)/);
  return match ? match[1] : "Solution";
}

async function resolveJava(): Promise<JavaRuntime | null> {
  if (globalStore.java !== undefined) return globalStore.java;

  const javacCandidates: string[] = [];
  const javaCandidates: string[] = [];
  if (process.env.HTP_JAVAC) javacCandidates.push(process.env.HTP_JAVAC);
  if (process.env.HTP_JAVA) javaCandidates.push(process.env.HTP_JAVA);

  const javacFound = await which("javac");
  const javaFound = await which("java");
  if (javacFound) javacCandidates.push(javacFound);
  if (javaFound) javaCandidates.push(javaFound);

  let resolved: JavaRuntime | null = null;

  for (const javac of javacCandidates) {
    const version = await run(javac, ["-version"], { timeoutMs: 8000 });
    const text = version.stdout + version.stderr;
    if (version.code !== 0 || !/javac|openjdk|version/i.test(text)) continue;

    const sibling = path.join(path.dirname(javac), process.platform === "win32" ? "java.exe" : "java");
    let java = process.env.HTP_JAVA ?? null;
    if (!java && (await fileExists(sibling))) java = sibling;
    if (!java) java = javaFound;
    if (!java) continue;

    const javaVersion = await run(java, ["-version"], { timeoutMs: 8000 });
    if (javaVersion.code !== 0 || !/openjdk|java\(tm\)|version/i.test(javaVersion.stdout + javaVersion.stderr)) {
      continue;
    }

    resolved = { javac, java, label: text.split(/\r?\n/)[0].trim() || "javac" };
    break;
  }

  globalStore.java = resolved;
  return resolved;
}

async function resolveC(): Promise<Runtime | null> {
  if (globalStore.c !== undefined) return globalStore.c;

  const candidates: string[] = [];
  if (process.env.HTP_CC) candidates.push(process.env.HTP_CC);
  for (const name of ["gcc", "clang", "cc"]) {
    const found = await which(name);
    if (found) candidates.push(found);
  }
  for (const pattern of [
    "C:\\msys64\\mingw64\\bin\\gcc.exe",
    "C:\\mingw64\\bin\\gcc.exe",
    "C:\\TDM-GCC-64\\bin\\gcc.exe",
    "C:\\MinGW\\bin\\gcc.exe",
    "*\\LLVM\\bin\\clang.exe",
  ]) {
    if (pattern.includes("*")) candidates.push(...(await globCandidates(pattern)));
    else if (await fileExists(pattern)) candidates.push(pattern);
  }

  let resolved: Runtime | null = null;
  for (const candidate of candidates) {
    const runtime = await probe(candidate, [], /(gcc|clang|free software foundation)/i, path.basename(candidate));
    if (runtime) {
      resolved = runtime;
      break;
    }
  }
  globalStore.c = resolved;
  return resolved;
}

export function normalizeOutput(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

export function firstDiffLine(actual: string, expected: string): number {
  const a = normalizeOutput(actual).split("\n");
  const e = normalizeOutput(expected).split("\n");
  const max = Math.max(a.length, e.length);
  for (let i = 0; i < max; i++) {
    if ((a[i] ?? "") !== (e[i] ?? "")) return i + 1;
  }
  return 0;
}

function compare(actual: string, expected: string): { status: JudgeStatus; message: string } {
  if (normalizeOutput(actual) === normalizeOutput(expected)) {
    return { status: "passed", message: "Pattern verified. Output matches the target matrix line-for-line." };
  }
  const line = firstDiffLine(actual, expected);
  return {
    status: "failed",
    message: `Output mismatch at line ${line}. The verification matrix does not match your pattern.`,
  };
}

function unavailable(language: Language): JudgeResult {
  return {
    status: "runtime-unavailable",
    output: "",
    expected: "",
    stderr: "",
    runtime: "none",
    durationMs: 0,
    message:
      language === "java"
        ? "No Java compiler (javac) was found on this server (install OpenJDK or set HTP_JAVAC/HTP_JAVA). Please solve this challenge in C, or try again once the runtime is available."
        : "No C compiler (gcc) was found on this server (install gcc or set HTP_CC). Please solve this challenge in Java, or try again once the runtime is available.",
  };
}

export async function judgeCode(language: Language, code: string, expected: string): Promise<JudgeResult> {
  if (process.env.CODEBOX_URL?.trim() || process.env.LOCAL_CODE_EXECUTION !== "true") {
    return judgeWithCodebox(language, code, expected);
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "htp-judge-"));

  try {
    if (language === "java") {
      const runtime = await resolveJava();
      if (!runtime) return unavailable("java");

      const className = detectJavaClassName(code);
      const file = path.join(workDir, `${className}.java`);
      await fs.writeFile(file, code, "utf8");

      const compile = await run(runtime.javac, ["-encoding", "UTF-8", "-d", workDir, file], {
        cwd: workDir,
        timeoutMs: COMPILE_TIMEOUT_MS,
      });
      if (compile.timedOut || compile.code !== 0) {
        return {
          status: "error",
          output: "",
          expected,
          stderr: compile.stderr || compile.stdout,
          runtime: runtime.label,
          durationMs: compile.durationMs,
          message: "Compilation failed. Check your Java source for syntax errors.",
        };
      }

      const outcome = await run(
        runtime.java,
        ["-Xmx64m", "-Xss1m", "-Dfile.encoding=UTF-8", "-cp", workDir, className],
        { cwd: workDir, timeoutMs: RUN_TIMEOUT_MS }
      );
      if (outcome.timedOut) {
        return {
          status: "timeout",
          output: outcome.stdout,
          expected,
          stderr: outcome.stderr,
          runtime: runtime.label,
          durationMs: outcome.durationMs,
          message: `Execution timed out after ${RUN_TIMEOUT_MS / 1000}s. Check for infinite loops.`,
        };
      }
      if (outcome.code !== 0 && outcome.code !== null) {
        return {
          status: "error",
          output: outcome.stdout,
          expected,
          stderr: outcome.stderr,
          runtime: runtime.label,
          durationMs: outcome.durationMs,
          message: "Runtime error while executing your program.",
        };
      }
      const verdict = compare(outcome.stdout, expected);
      return {
        status: verdict.status,
        output: outcome.stdout,
        expected,
        stderr: outcome.stderr,
        runtime: runtime.label,
        durationMs: outcome.durationMs,
        message: verdict.message,
      };
    }

    const runtime = await resolveC();
    if (!runtime) return unavailable("c");

    const file = path.join(workDir, "solution.c");
    const binary = path.join(workDir, process.platform === "win32" ? "solution.exe" : "solution");
    await fs.writeFile(file, code, "utf8");

    const compile = await run(runtime.cmd, ["-O2", "-std=c11", "-o", binary, file], {
      cwd: workDir,
      timeoutMs: COMPILE_TIMEOUT_MS,
    });
    if (compile.timedOut || compile.code !== 0) {
      return {
        status: "error",
        output: "",
        expected,
        stderr: compile.stderr || compile.stdout,
        runtime: runtime.label,
        durationMs: compile.durationMs,
        message: "Compilation failed. Check your C source for syntax errors.",
      };
    }

    const outcome = await run(binary, [], { cwd: workDir, timeoutMs: RUN_TIMEOUT_MS });
    if (outcome.timedOut) {
      return {
        status: "timeout",
        output: outcome.stdout,
        expected,
        stderr: outcome.stderr,
        runtime: runtime.label,
        durationMs: outcome.durationMs,
        message: `Execution timed out after ${RUN_TIMEOUT_MS / 1000}s. Check for infinite loops.`,
      };
    }
    if (outcome.code !== 0 && outcome.code !== null) {
      return {
        status: "error",
        output: outcome.stdout,
        expected,
        stderr: outcome.stderr,
        runtime: runtime.label,
        durationMs: outcome.durationMs,
        message: "Runtime error while executing your program.",
      };
    }
    const verdict = compare(outcome.stdout, expected);
    return {
      status: verdict.status,
      output: outcome.stdout,
      expected,
      stderr: outcome.stderr,
      runtime: runtime.label,
      durationMs: outcome.durationMs,
      message: verdict.message,
    };
  } finally {
    fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function availableRuntimes(): Promise<Record<Language, boolean>> {
  const baseUrl = process.env.CODEBOX_URL?.trim().replace(/\/$/, "");
  const token = process.env.CODEBOX_AUTH_TOKEN?.trim();

  if (baseUrl && token) {
    try {
      const response = await fetch(`${baseUrl}/languages`, {
        headers: { "X-Auth-Token": token },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (!response.ok) return { java: false, c: false };

      const languages = (await response.json()) as Array<{ id?: number }>;
      const available = new Set(languages.map((language) => language.id));
      return {
        c: available.has(CODEBOX_LANGUAGE_IDS.c),
        java: available.has(CODEBOX_LANGUAGE_IDS.java),
      };
    } catch {
      return { java: false, c: false };
    }
  }

  if (process.env.LOCAL_CODE_EXECUTION !== "true") {
    return { java: false, c: false };
  }

  const [java, c] = await Promise.all([resolveJava(), resolveC()]);
  return { java: Boolean(java), c: Boolean(c) };
}
