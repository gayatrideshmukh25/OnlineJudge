// const fs = require("fs");

// const os = require("os");
// const path = require("path");
// const { spawn } = require("child_process");
// const { randomUUID } = require("crypto");

// const PYTHON_IMAGE = "python:3.12-slim";

// const COMPILE_TIMEOUT = 30000; // Not needed for Python, kept for consistency
// const RUN_TIMEOUT = 5000;
// const MEMORY_LIMIT = "128m";
// const CPU_LIMIT = "0.5";

// function removeContainer(containerName) {
//   return new Promise((resolve) => {
//     const docker = spawn("docker", ["rm", "-f", containerName]);

//     docker.on("error", () => resolve());
//     docker.on("close", () => resolve());
//   });
// }

// function readPeakMemory(workDir) {
//   try {
//     const memoryFile = path.join(workDir, ".peak-memory");

//     if (!fs.existsSync(memoryFile)) {
//       return 0;
//     }

//     const bytes = Number(fs.readFileSync(memoryFile, "utf8").trim());

//     return Number.isFinite(bytes) && bytes >= 0 ? bytes / (1024 * 1024) : 0;
//   } catch {
//     return 0;
//   }
// }

// function executeTestCase(code, testCase) {
//   return new Promise(async (resolve) => {
//     const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "python-judge-"));

//     const containerName = `python-${randomUUID()}`;

//     const codePath = path.join(workDir, "Main.py");

//     fs.writeFileSync(codePath, code, "utf8");

//     const input = testCase.input ?? "";

//     const dockerArgs = [
//       "run",
//       "--name",
//       containerName,
//       "-i",
//       "--network",
//       "none",
//       "--memory",
//       MEMORY_LIMIT,
//       "--cpus",
//       CPU_LIMIT,
//       "--pids-limit",
//       "64",
//       "--user",
//       "65534:65534",
//       "--read-only",
//       "--tmpfs",
//       "/tmp:rw,noexec,nosuid,size=16m",
//       "--cap-drop",
//       "ALL",
//       "--security-opt",
//       "no-new-privileges",
//       "-v",
//       `${workDir}:/app:ro`,
//       "-w",
//       "/app",
//       PYTHON_IMAGE,
//       "sh",
//       "-c",
//       'python3 -B -u /app/Main.py; code=$?; cat /sys/fs/cgroup/memory.peak > /tmp/peak-memory 2>/dev/null; exit "$code"',
//     ];

//     // The code directory is read-only. Write the memory result to a
//     // separate writable location only if the container permits it.
//     // We therefore capture the cgroup peak before exit via a wrapper
//     // that stores it in the mounted directory in the version below.
//     dockerArgs[dockerArgs.length - 1] =
//       'python3 -B -u /app/Main.py; code=$?; exit "$code"';

//     const startTime = process.hrtime.bigint();

//     let stdout = "";
//     let stderr = "";
//     let timedOut = false;
//     let settled = false;
//     let timeout;
//     let statsInterval;
//     let peakMemory = 0;

//     const finish = async (result) => {
//       if (settled) return;
//       settled = true;

//       clearTimeout(timeout);
//       clearInterval(statsInterval);

//       await removeContainer(containerName);

//       try {
//         fs.rmSync(workDir, {
//           recursive: true,
//           force: true,
//         });
//       } catch {}

//       resolve(result);
//     };

//     const docker = spawn("docker", dockerArgs);

//     // Feed the test case input to Python's standard input.
//     docker.stdin.on("error", () => {});
//     docker.stdin.end(String(input));

//     timeout = setTimeout(() => {
//       timedOut = true;

//       // Stop the container when the time limit is exceeded.
//       const killer = spawn("docker", ["kill", containerName]);

//       killer.on("error", () => {});
//       docker.kill("SIGTERM");

//       setTimeout(() => {
//         if (!settled) docker.kill("SIGKILL");
//       }, 1000);
//     }, RUN_TIMEOUT);

//     // Read live memory usage while the container is running.
//     statsInterval = setInterval(() => {
//       const stats = spawn("docker", [
//         "stats",
//         "--no-stream",
//         "--format",
//         "{{.MemUsage}}",
//         containerName,
//       ]);

//       let output = "";

//       stats.stdout.on("data", (chunk) => {
//         output += chunk.toString();
//       });

//       stats.on("close", () => {
//         // Example Docker output: 20.4MiB / 128MiB
//         const match = output.match(/([\d.]+)\s*(KiB|MiB|GiB|B)/i);

//         if (!match) return;

//         const value = Number(match[1]);
//         const unit = match[2].toLowerCase();

//         let memoryMB = value;

//         if (unit === "kib") memoryMB = value / 1024;
//         if (unit === "gib") memoryMB = value * 1024;
//         if (unit === "b") memoryMB = value / (1024 * 1024);

//         peakMemory = Math.max(peakMemory, memoryMB);
//       });

//       stats.on("error", () => {});
//     }, 100);

//     docker.stdout.on("data", (chunk) => {
//       stdout += chunk.toString();
//     });

//     docker.stderr.on("data", (chunk) => {
//       stderr += chunk.toString();
//     });

//     docker.on("error", async (error) => {
//       await finish({
//         testCase,
//         output: "",
//         error: error.message,
//         runtime: 0,
//         memory: 0,
//         status: "Runtime Error",
//       });
//     });

//     docker.on("close", async (exitCode) => {
//       const runtime = Number(process.hrtime.bigint() - startTime) / 1e6;

//       if (timedOut) {
//         await finish({
//           testCase,
//           output: stdout.trim(),
//           error: "Time Limit Exceeded",
//           runtime,
//           memory: peakMemory,
//           status: "Time Limit Exceeded",
//         });
//         return;
//       }

//       // Docker stats can stop reporting once the container exits.
//       // Use the peak observed while it was running.
//       const memory = Math.max(peakMemory, readPeakMemory(workDir));

//       if (exitCode !== 0) {
//         await finish({
//           testCase,
//           output: stdout.trim(),
//           error: stderr.trim() || "Python execution failed",
//           runtime,
//           memory,
//           status: "Runtime Error",
//         });
//         return;
//       }

//       await finish({
//         testCase,
//         output: stdout.trim(),
//         error: stderr.trim(),
//         runtime,
//         memory,
//         status: "Executed",
//       });
//     });
//   });
// }

// async function executePython(code, testCases) {
//   const results = [];

//   for (const testCase of testCases) {
//     const result = await executeTestCase(code, testCase);
//     results.push(result);

//     if (result.status === "Time Limit Exceeded") {
//       // Remaining test cases need not be run after a TLE.
//       break;
//     }
//   }

//   const runtime = results.length
//     ? Math.max(...results.map((r) => r.runtime))
//     : 0;

//   const memory = results.length ? Math.max(...results.map((r) => r.memory)) : 0;

//   return {
//     results,
//     runtime,
//     memory,
//   };
// }

// module.exports = executePython;

// const fs = require("fs");
// const os = require("os");
// const path = require("path");
// const { spawn } = require("child_process");
// const { randomUUID } = require("crypto");

// const PYTHON_IMAGE = "python:3.12-slim";

// const RUN_TIMEOUT = 5000;
// const MEMORY_LIMIT = "128m";
// const CPU_LIMIT = "0.5";
// const OUTPUT_LIMIT = 1024 * 1024; // 1 MiB per output stream
// const KILL_GRACE_MS = 500;
// const STATS_INTERVAL_MS = 250;

// function runDockerCommand(args, timeoutMs = 2000) {
//   return new Promise((resolve) => {
//     let stdout = "";
//     let stderr = "";
//     let settled = false;

//     let child;

//     try {
//       child = spawn("docker", args, {
//         stdio: ["ignore", "pipe", "pipe"],
//       });
//     } catch (error) {
//       resolve({ code: null, stdout, stderr, error: error.message });
//       return;
//     }

//     const timer = setTimeout(() => {
//       if (settled) return;

//       settled = true;
//       child.kill("SIGKILL");

//       resolve({
//         code: null,
//         stdout,
//         stderr,
//         error: "Docker command timed out",
//       });
//     }, timeoutMs);

//     child.stdout.on("data", (chunk) => {
//       if (stdout.length < 65536) {
//         stdout += chunk.toString();
//       }
//     });

//     child.stderr.on("data", (chunk) => {
//       if (stderr.length < 65536) {
//         stderr += chunk.toString();
//       }
//     });

//     child.on("error", (error) => {
//       if (settled) return;

//       settled = true;
//       clearTimeout(timer);

//       resolve({
//         code: null,
//         stdout,
//         stderr,
//         error: error.message,
//       });
//     });

//     child.on("close", (code) => {
//       if (settled) return;

//       settled = true;
//       clearTimeout(timer);

//       resolve({ code, stdout, stderr });
//     });
//   });
// }

// async function removeContainer(containerName) {
//   // Best-effort cleanup. Do not replace the execution result
//   // with a cleanup error.
//   await runDockerCommand(["rm", "-f", containerName], 3000);
// }

// function parseDockerMemory(value) {
//   // Example: "20.4MiB / 128MiB"
//   const match = String(value).match(
//     /^\s*([\d.]+)\s*(B|KiB|MiB|GiB|kB|MB|GB)\s*\//i,
//   );

//   if (!match) return 0;

//   const amount = Number(match[1]);

//   if (!Number.isFinite(amount) || amount < 0) {
//     return 0;
//   }

//   const unit = match[2].toLowerCase();

//   if (unit === "b") return amount / (1024 * 1024);
//   if (unit === "kib" || unit === "kb") return amount / 1024;
//   if (unit === "mib" || unit === "mb") return amount;
//   if (unit === "gib" || unit === "gb") return amount * 1024;

//   return 0;
// }

// function executeTestCase(code, testCase) {
//   return new Promise((resolve) => {
//     let workDir;
//     let containerName;
//     let docker;

//     let settled = false;
//     let timedOut = false;
//     let outputExceeded = false;
//     let timeout;
//     let killTimer;
//     let statsInterval;
//     let statsInFlight = false;

//     let stdout = "";
//     let stderr = "";
//     let peakMemory = 0;

//     const startTime = process.hrtime.bigint();

//     function getRuntime() {
//       return Number(process.hrtime.bigint() - startTime) / 1e6;
//     }

//     function appendOutput(current, chunk) {
//       const remaining = OUTPUT_LIMIT - Buffer.byteLength(current, "utf8");

//       if (remaining <= 0) {
//         return { value: current, exceeded: true };
//       }

//       const buffer = Buffer.from(chunk);

//       if (buffer.length <= remaining) {
//         return {
//           value: current + buffer.toString("utf8"),
//           exceeded: false,
//         };
//       }

//       return {
//         value: current + buffer.subarray(0, remaining).toString("utf8"),
//         exceeded: true,
//       };
//     }

//     function killExecution() {
//       if (containerName) {
//         // Kill the actual container, not only the Docker CLI.
//         const killer = spawn("docker", ["kill", containerName]);

//         killer.on("error", () => {});
//       }

//       if (docker && !docker.killed) {
//         docker.kill("SIGTERM");
//       }

//       clearTimeout(killTimer);

//       killTimer = setTimeout(() => {
//         if (docker && !docker.killed) {
//           docker.kill("SIGKILL");
//         }
//       }, KILL_GRACE_MS);
//     }

//     async function finish(result) {
//       if (settled) return;

//       settled = true;

//       clearTimeout(timeout);
//       clearTimeout(killTimer);
//       clearInterval(statsInterval);

//       if (containerName) {
//         await removeContainer(containerName);
//       }

//       if (workDir) {
//         try {
//           fs.rmSync(workDir, {
//             recursive: true,
//             force: true,
//           });
//         } catch {
//           // Best-effort temporary-file cleanup.
//         }
//       }

//       resolve(result);
//     }

//     function collectOutput(target, chunk) {
//       if (settled) return;

//       const current = target === "stdout" ? stdout : stderr;
//       const appended = appendOutput(current, chunk);

//       if (target === "stdout") {
//         stdout = appended.value;
//       } else {
//         stderr = appended.value;
//       }

//       if (appended.exceeded && !outputExceeded) {
//         outputExceeded = true;
//         killExecution();
//       }
//     }

//     async function sampleMemory() {
//       if (settled || statsInFlight || !containerName) {
//         return;
//       }

//       statsInFlight = true;

//       try {
//         const stats = await runDockerCommand(
//           ["stats", "--no-stream", "--format", "{{.MemUsage}}", containerName],
//           1500,
//         );

//         peakMemory = Math.max(peakMemory, parseDockerMemory(stats.stdout));
//       } finally {
//         statsInFlight = false;
//       }
//     }

//     (async () => {
//       try {
//         if (typeof code !== "string") {
//           await finish({
//             testCase,
//             output: "",
//             error: "Code must be a string",
//             runtime: 0,
//             memory: 0,
//             status: "Runtime Error",
//           });
//           return;
//         }

//         // Create the source directory and allow the container's
//         // non-root user to read the source file.
//         workDir = fs.mkdtempSync(path.join(os.tmpdir(), "python-judge-"));

//         fs.chmodSync(workDir, 0o755);

//         const codePath = path.join(workDir, "Main.py");

//         fs.writeFileSync(codePath, code, {
//           encoding: "utf8",
//           mode: 0o644,
//         });

//         containerName = `python-${randomUUID()}`;

//         const dockerArgs = [
//           "run",
//           "--name",
//           containerName,
//           "--label",
//           "app=python-judge",
//           "-i",

//           // Network and resource restrictions.
//           "--network",
//           "none",
//           "--memory",
//           MEMORY_LIMIT,
//           "--memory-swap",
//           MEMORY_LIMIT,
//           "--cpus",
//           CPU_LIMIT,
//           "--pids-limit",
//           "64",

//           // Run as a non-root user.
//           "--user",
//           "65534:65534",

//           // Container hardening.
//           "--read-only",
//           "--tmpfs",
//           "/tmp:rw,noexec,nosuid,size=16m",
//           "--cap-drop",
//           "ALL",
//           "--security-opt",
//           "no-new-privileges",

//           // Avoid storing container logs through Docker's log driver.
//           "--log-driver",
//           "none",

//           // Source code is read-only inside the container.
//           "-v",
//           `${workDir}:/app:ro`,
//           "-w",
//           "/app",

//           PYTHON_IMAGE,
//           "python3",
//           "-B",
//           "-u",
//           "/app/Main.py",
//         ];

//         docker = spawn("docker", dockerArgs, {
//           stdio: ["pipe", "pipe", "pipe"],
//         });

//         docker.stdin.on("error", () => {});

//         docker.stdin.end(String(testCase?.input ?? ""));

//         docker.stdout.on("data", (chunk) => {
//           collectOutput("stdout", chunk);
//         });

//         docker.stderr.on("data", (chunk) => {
//           collectOutput("stderr", chunk);
//         });

//         timeout = setTimeout(() => {
//           if (settled) return;

//           timedOut = true;
//           killExecution();
//         }, RUN_TIMEOUT);

//         statsInterval = setInterval(() => {
//           sampleMemory().catch(() => {});
//         }, STATS_INTERVAL_MS);

//         docker.on("error", async (error) => {
//           await finish({
//             testCase,
//             output: stdout.trim(),
//             error: error.message,
//             runtime: getRuntime(),
//             memory: peakMemory,
//             status: "Runtime Error",
//           });
//         });

//         docker.on("close", async (exitCode) => {
//           // Stop the execution timer immediately when the Docker
//           // CLI closes, before waiting for the final stats query.
//           clearTimeout(timeout);
//           clearInterval(statsInterval);

//           const runtime = getRuntime();

//           await sampleMemory();

//           if (timedOut) {
//             await finish({
//               testCase,
//               output: stdout.trim(),
//               error: "Time Limit Exceeded",
//               runtime,
//               memory: peakMemory,
//               status: "Time Limit Exceeded",
//             });
//             return;
//           }

//           if (outputExceeded) {
//             await finish({
//               testCase,
//               output: stdout.trim(),
//               error: "Output Limit Exceeded",
//               runtime,
//               memory: peakMemory,
//               status: "Output Limit Exceeded",
//             });
//             return;
//           }

//           if (exitCode !== 0) {
//             await finish({
//               testCase,
//               output: stdout.trim(),
//               error:
//                 stderr.trim() ||
//                 `Python execution failed (exit code ${exitCode})`,
//               runtime,
//               memory: peakMemory,
//               status: "Runtime Error",
//             });
//             return;
//           }

//           await finish({
//             testCase,
//             output: stdout.trim(),
//             error: stderr.trim(),
//             runtime,
//             memory: peakMemory,
//             status: "Executed",
//           });
//         });
//       } catch (error) {
//         await finish({
//           testCase,
//           output: stdout.trim(),
//           error: error.message || "Execution failed",
//           runtime: getRuntime(),
//           memory: peakMemory,
//           status: "Runtime Error",
//         });
//       }
//     })();
//   });
// }

// async function executePython(code, testCases) {
//   if (!Array.isArray(testCases)) {
//     throw new TypeError("testCases must be an array");
//   }

//   const results = [];

//   for (const testCase of testCases) {
//     const result = await executeTestCase(code, testCase);

//     results.push(result);

//     // Stop running test cases after a hard execution limit.
//     if (
//       result.status === "Time Limit Exceeded" ||
//       result.status === "Output Limit Exceeded"
//     ) {
//       break;
//     }
//   }

//   const runtime = results.length
//     ? Math.max(...results.map((result) => result.runtime))
//     : 0;

//   const memory = results.length
//     ? Math.max(...results.map((result) => result.memory))
//     : 0;

//   return {
//     results,
//     runtime,
//     memory,
//   };
// }

// module.exports = executePython;

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
