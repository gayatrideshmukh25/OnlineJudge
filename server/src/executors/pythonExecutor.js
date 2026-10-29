const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { randomUUID } = require("crypto");

const PYTHON_IMAGE = "python:3.12-slim";

const RUN_TIMEOUT = 5000;
const MEMORY_LIMIT = "128m";
const CPU_LIMIT = "0.5";
const OUTPUT_LIMIT = 1024 * 1024;
const STATS_INTERVAL = 100;

const PEAK_MARKER = "__JUDGE_PEAK_MEMORY_BYTES__=";

function parseMemoryMB(value) {
  // Docker stats example: 20.4MiB / 128MiB
  const match = String(value).match(
    /([\d.]+)\s*(B|KiB|MiB|GiB|kB|MB|GB)\s*\//i,
  );

  if (!match) return 0;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return 0;

  const unit = match[2].toLowerCase();

  if (unit === "b") return amount / (1024 * 1024);
  if (unit === "kib" || unit === "kb") return amount / 1024;
  if (unit === "mib" || unit === "mb") return amount;
  if (unit === "gib" || unit === "gb") return amount * 1024;

  return 0;
}

function extractPeakMemory(stderr) {
  // The wrapper emits the cgroup peak counter after Python exits.
  const regex = new RegExp(
    PEAK_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)",
  );

  const match = stderr.match(regex);

  if (!match) {
    return { memory: 0, stderr };
  }

  const bytes = Number(match[1]);

  const memory =
    Number.isFinite(bytes) && bytes >= 0 ? bytes / (1024 * 1024) : 0;

  // Do not expose the internal measurement marker as an error.
  const cleanStderr = stderr
    .replace(
      new RegExp(
        "(?:\\r?\\n)?" +
          PEAK_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "\\d+",
        "g",
      ),
      "",
    )
    .trim();

  return { memory, stderr: cleanStderr };
}

function runDockerCommand(args, timeoutMs = 2000) {
  return new Promise((resolve) => {
    let child;
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    try {
      child = spawn("docker", args, {
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      resolve({
        code: null,
        stdout,
        stderr,
        error: error.message,
      });
      return;
    }

    const timer = setTimeout(() => {
      child.kill("SIGKILL");

      finish({
        code: null,
        stdout,
        stderr,
        error: "Docker command timed out",
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      if (stdout.length < 65536) {
        stdout += chunk.toString();
      }
    });

    child.stderr.on("data", (chunk) => {
      if (stderr.length < 65536) {
        stderr += chunk.toString();
      }
    });

    child.on("error", (error) => {
      finish({
        code: null,
        stdout,
        stderr,
        error: error.message,
      });
    });

    child.on("close", (code) => {
      finish({ code, stdout, stderr });
    });
  });
}

async function removeContainer(containerName) {
  await runDockerCommand(["rm", "-f", containerName], 3000);
}

function executeTestCase(code, testCase) {
  return new Promise((resolve) => {
    let workDir;
    let containerName;
    let docker;

    let settled = false;
    let timedOut = false;
    let outputExceeded = false;
    let statsInFlight = false;

    let timeoutTimer;
    let killTimer;
    let statsTimer;

    let stdout = "";
    let stderr = "";
    let peakMemory = 0;

    const start = process.hrtime.bigint();

    const getRuntime = () => Number(process.hrtime.bigint() - start) / 1e6;

    function finish(result) {
      if (settled) return;
      settled = true;

      clearTimeout(timeoutTimer);
      clearTimeout(killTimer);
      clearInterval(statsTimer);

      (async () => {
        if (containerName) {
          await removeContainer(containerName);
        }

        if (workDir) {
          try {
            fs.rmSync(workDir, {
              recursive: true,
              force: true,
            });
          } catch {
            // Best-effort temporary directory cleanup.
          }
        }

        resolve(result);
      })();
    }

    function appendLimited(current, chunk) {
      const buffer = Buffer.from(chunk);
      const remaining = OUTPUT_LIMIT - Buffer.byteLength(current, "utf8");

      if (remaining <= 0) {
        return { value: current, exceeded: true };
      }

      if (buffer.length <= remaining) {
        return {
          value: current + buffer.toString("utf8"),
          exceeded: false,
        };
      }

      return {
        value: current + buffer.subarray(0, remaining).toString("utf8"),
        exceeded: true,
      };
    }

    function killExecution() {
      if (containerName) {
        const killer = spawn("docker", ["kill", containerName]);

        killer.on("error", () => {});
      }

      if (docker) {
        try {
          docker.kill("SIGTERM");
        } catch {}

        clearTimeout(killTimer);

        killTimer = setTimeout(() => {
          try {
            docker.kill("SIGKILL");
          } catch {}
        }, 500);
      }
    }

    async function sampleMemory() {
      if (settled || statsInFlight || !containerName) return;

      statsInFlight = true;

      try {
        const stats = await runDockerCommand(
          ["stats", "--no-stream", "--format", "{{.MemUsage}}", containerName],
          1500,
        );

        peakMemory = Math.max(peakMemory, parseMemoryMB(stats.stdout));
      } finally {
        statsInFlight = false;
      }
    }

    function collectOutput(target, chunk) {
      if (settled) return;

      const current = target === "stdout" ? stdout : stderr;
      const result = appendLimited(current, chunk);

      if (target === "stdout") {
        stdout = result.value;
      } else {
        stderr = result.value;
      }

      if (result.exceeded && !outputExceeded) {
        outputExceeded = true;
        killExecution();
      }
    }

    (async () => {
      try {
        if (typeof code !== "string") {
          finish({
            testCase,
            output: "",
            error: "Code must be a string",
            runtime: 0,
            memory: 0,
            status: "Runtime Error",
          });
          return;
        }

        workDir = fs.mkdtempSync(path.join(os.tmpdir(), "python-judge-"));

        // The directory must be traversable by Docker's
        // non-root user. The source file remains read-only.
        fs.chmodSync(workDir, 0o755);

        fs.writeFileSync(path.join(workDir, "Main.py"), code, {
          encoding: "utf8",
          mode: 0o644,
        });

        containerName = `python-${randomUUID()}`;

        const wrapper = [
          "python3 -B -u /app/Main.py",
          "code=$?",
          `peak=$(cat /sys/fs/cgroup/memory.peak 2>/dev/null)`,
          `printf '\\n${PEAK_MARKER}%s\\n' "$peak" >&2`,
          'exit "$code"',
        ].join("; ");

        const args = [
          "run",
          "--name",
          containerName,
          "-i",
          "--network",
          "none",
          "--memory",
          MEMORY_LIMIT,
          "--memory-swap",
          MEMORY_LIMIT,
          "--cpus",
          CPU_LIMIT,
          "--pids-limit",
          "64",
          "--user",
          "65534:65534",
          "--read-only",
          "--tmpfs",
          "/tmp:rw,noexec,nosuid,size=16m",
          "--cap-drop",
          "ALL",
          "--security-opt",
          "no-new-privileges",
          "--log-driver",
          "none",
          "-v",
          `${workDir}:/app:ro`,
          "-w",
          "/app",
          PYTHON_IMAGE,
          "sh",
          "-c",
          wrapper,
        ];

        docker = spawn("docker", args, {
          stdio: ["pipe", "pipe", "pipe"],
        });

        docker.stdin.on("error", () => {});
        docker.stdin.end(String(testCase?.input ?? ""));

        docker.stdout.on("data", (chunk) => {
          collectOutput("stdout", chunk);
        });

        docker.stderr.on("data", (chunk) => {
          collectOutput("stderr", chunk);
        });

        timeoutTimer = setTimeout(() => {
          if (settled) return;
          timedOut = true;
          killExecution();
        }, RUN_TIMEOUT);

        statsTimer = setInterval(() => {
          sampleMemory().catch(() => {});
        }, STATS_INTERVAL);

        docker.on("error", (error) => {
          finish({
            testCase,
            output: stdout.trim(),
            error: error.message,
            runtime: getRuntime(),
            memory: peakMemory,
            status: "Runtime Error",
          });
        });

        docker.on("close", async (exitCode) => {
          clearTimeout(timeoutTimer);
          clearInterval(statsTimer);

          // Read the last available Docker stats before cleanup.
          await sampleMemory();

          const measured = extractPeakMemory(stderr);
          stderr = measured.stderr;

          // Prefer the cgroup's actual peak over sampled usage.
          peakMemory = Math.max(peakMemory, measured.memory);

          const runtime = getRuntime();

          if (timedOut) {
            finish({
              testCase,
              output: stdout.trim(),
              error: "Time Limit Exceeded",
              runtime,
              memory: peakMemory,
              status: "Time Limit Exceeded",
            });
            return;
          }

          if (outputExceeded) {
            finish({
              testCase,
              output: stdout.trim(),
              error: "Output Limit Exceeded",
              runtime,
              memory: peakMemory,
              status: "Output Limit Exceeded",
            });
            return;
          }

          if (exitCode !== 0) {
            finish({
              testCase,
              output: stdout.trim(),
              error:
                stderr.trim() ||
                `Python execution failed (exit code ${exitCode})`,
              runtime,
              memory: peakMemory,
              status: "Runtime Error",
            });
            return;
          }

          finish({
            testCase,
            output: stdout.trim(),
            error: stderr.trim(),
            runtime,
            memory: peakMemory,
            status: "Executed",
          });
        });
      } catch (error) {
        finish({
          testCase,
          output: stdout.trim(),
          error: error.message || "Execution failed",
          runtime: getRuntime(),
          memory: peakMemory,
          status: "Runtime Error",
        });
      }
    })();
  });
}

async function executePython(code, testCases) {
  if (!Array.isArray(testCases)) {
    throw new TypeError("testCases must be an array");
  }

  const results = [];

  for (const testCase of testCases) {
    const result = await executeTestCase(code, testCase);
    results.push(result);

    if (
      result.status === "Time Limit Exceeded" ||
      result.status === "Output Limit Exceeded"
    ) {
      break;
    }
  }
  const runtime = results.length
    ? Math.max(...results.map((result) => result.runtime))
    : 0;
  const memory = results.length
    ? Math.max(...results.map((result) => result.memory))
    : 0;

  const failedResult = results.find((result) => result.status !== "Executed");

  if (failedResult) {
    return {
      success: false,
      status: failedResult.status,
      error: failedResult.error,
      output: failedResult.output,
      runtime,
      memory,
      passed: 0,
      total: testCases.length,
      results: [],
    };
  }

  return {
    success: true,
    results,
    runtime,
    memory,
    passed: results.length,
    total: testCases.length,
  };
}

module.exports = executePython;
