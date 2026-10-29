const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { randomUUID } = require("crypto");

const JAVA_IMAGE = "eclipse-temurin:17";

const COMPILE_TIMEOUT = 30000;
const RUN_TIMEOUT = 5000;

const MEMORY_LIMIT = "128m";
const COMPILE_MEMORY_LIMIT = "256m";

const CPU_LIMIT = "0.5";
const COMPILE_CPU_LIMIT = "1";

const javaExecutor = async (code, testCases) => {
  const folderName = randomUUID();
  const tempDir = path.join(__dirname, "../../temp", folderName);

  fs.mkdirSync(tempDir, { recursive: true });

  try {
    fs.writeFileSync(path.join(tempDir, "Main.java"), code);

    const dockerDir = path.resolve(tempDir).replace(/\\/g, "/");

    // 1. Compile Java once.
    const compileResult = await runDocker(
      `oj-java-compile-${folderName}`,
      dockerDir,
      ["javac", "Main.java"],
      null,
      COMPILE_TIMEOUT,
      COMPILE_MEMORY_LIMIT,
      COMPILE_CPU_LIMIT,
    );

    if (compileResult.timedOut) {
      return failure(
        "Compilation Error",
        "Compilation time exceeded the limit",
        compileResult,
        testCases.length,
      );
    }

    if (compileResult.oomKilled) {
      return failure(
        "Compilation Error",
        "Compilation exceeded its memory limit",
        compileResult,
        testCases.length,
      );
    }

    if (compileResult.exitCode !== 0) {
      return failure(
        "Compilation Error",
        compileResult.stderr || "Compilation failed",
        compileResult,
        testCases.length,
      );
    }

    // 2. Execute each test case in a separate container.
    const results = [];
    let maxRuntime = 0;
    let maxMemory = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      const runResult = await runDocker(
        `oj-java-run-${folderName}-${i}`,
        dockerDir,
        [
          "sh",
          "-c",
          'java -Xms16m -Xmx96m Main; code=$?; cat /sys/fs/cgroup/memory.peak > /app/.peak-memory; exit "$code"',
        ],
        testCase.input || "",
        RUN_TIMEOUT,
        MEMORY_LIMIT,
        CPU_LIMIT,
      );

      maxRuntime = Math.max(maxRuntime, runResult.runtime);
      maxMemory = Math.max(maxMemory, runResult.memory);

      if (runResult.timedOut) {
        return {
          success: false,
          status: "Time Limit Exceeded",
          error: `Execution exceeded ${RUN_TIMEOUT} ms`,
          runtime: maxRuntime,
          memory: maxMemory,
          passed: 0,
          total: testCases.length,
          results: [],
        };
      }

      if (runResult.oomKilled) {
        return {
          success: false,
          status: "Memory Limit Exceeded",
          error: `Execution exceeded the container memory limit of ${MEMORY_LIMIT}`,
          runtime: maxRuntime,
          memory: maxMemory,
          passed: 0,
          total: testCases.length,
          results: [],
        };
      }

      if (runResult.exitCode !== 0) {
        return {
          success: false,
          status: "Runtime Error",
          error:
            runResult.stderr ||
            `Program exited with code ${runResult.exitCode}`,
          output: runResult.stdout,
          runtime: maxRuntime,
          memory: maxMemory,
          passed: 0,
          total: testCases.length,
          results: [],
        };
      }

      results.push({
        testCase,
        output: runResult.stdout,
        runtime: runResult.runtime,
        memory: runResult.memory,
      });
    }

    return {
      success: true,
      status: "Accepted",
      runtime: maxRuntime,
      memory: maxMemory,
      passed: results.length,
      total: testCases.length,
      results,
    };
  } catch (error) {
    return {
      success: false,
      status: "System Error",
      error: error.message,
      runtime: 0,
      memory: 0,
      passed: 0,
      total: testCases.length,
      results: [],
    };
  } finally {
    cleanup(tempDir);
  }
};

function failure(status, error, result, total) {
  return {
    success: false,
    status,
    error,
    runtime: result.runtime,
    memory: result.memory,
    passed: 0,
    total,
    results: [],
  };
}

// =====================================================
// DOCKER RUNNER
// =====================================================

function runDocker(
  containerName,
  dockerDir,
  command,
  input,
  timeout,
  memory,
  cpus,
) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const peakMemoryFile = path.join(dockerDir, ".peak-memory");

    // Never reuse a previous test's measurement.
    try {
      fs.rmSync(peakMemoryFile, { force: true });
    } catch {
      // The file may not exist yet.
    }

    const args = [
      "run",
      "-i",
      "--name",
      containerName,
      "--network",
      "none",
      "--memory",
      memory,
      "--memory-swap",
      memory,
      "--cpus",
      cpus,
      "-v",
      `${dockerDir}:/app`,
      "-w",
      "/app",
      JAVA_IMAGE,
      ...command,
    ];

    const docker = spawn("docker", args);

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let peakMemory = 0;
    let settled = false;
    let statsInFlight = false;

    const getRuntime = () => Number(process.hrtime.bigint() - start) / 1e6;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    // Poll Docker stats while the container is running.
    const statsTimer = setInterval(() => {
      if (statsInFlight || settled) return;
      statsInFlight = true;

      const stats = spawn("docker", [
        "stats",
        "--no-stream",
        "--format",
        "{{.MemUsage}}",
        containerName,
      ]);

      let output = "";

      stats.stdout.on("data", (data) => {
        output += data.toString();
      });

      stats.on("error", () => {
        statsInFlight = false;
      });

      stats.on("close", (exitCode) => {
        statsInFlight = false;

        if (exitCode !== 0) return;

        const match = output.match(/([\d.]+)\s*(B|KiB|MiB|GiB)/);
        if (!match) return;

        const value = parseFloat(match[1]);
        const factors = {
          B: 1 / (1024 * 1024),
          KiB: 1 / 1024,
          MiB: 1,
          GiB: 1024,
        };

        peakMemory = Math.max(peakMemory, value * factors[match[2]]);
      });
    }, 100);

    const timeoutTimer = setTimeout(() => {
      timedOut = true;

      const killer = spawn("docker", ["kill", containerName]);

      killer.on("error", (error) => {
        console.error("Docker kill failed:", error.message);
      });
    }, timeout);

    const clearMonitoring = () => {
      clearTimeout(timeoutTimer);
      clearInterval(statsTimer);
    };

    docker.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    docker.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    docker.on("error", (error) => {
      clearMonitoring();

      removeContainer(containerName);

      finish({
        exitCode: -1,
        stdout,
        stderr: error.message,
        runtime: getRuntime(),
        memory: peakMemory,
        timedOut: false,
        oomKilled: false,
      });
    });

    docker.on("close", async (exitCode) => {
      clearMonitoring();

      // Read the cgroup peak counter saved by the Java container.
      try {
        const rawBytes = fs.readFileSync(peakMemoryFile, "utf8").trim();

        const bytes = Number(rawBytes);

        if (Number.isFinite(bytes) && bytes >= 0) {
          peakMemory = Math.max(peakMemory, bytes / (1024 * 1024));
        }
      } catch {
        // A timeout, OOM kill, or compile command may not
        // have produced a memory file. Keep sampled stats.
      }

      const oomKilled = await inspectOOM(containerName);

      console.log({
        container: containerName,
        runtimeMs: Number(getRuntime().toFixed(2)),
        peakMemoryMB: Number(peakMemory.toFixed(2)),
        timedOut,
        oomKilled,
      });

      removeContainer(containerName);

      finish({
        exitCode,
        stdout,
        stderr,
        runtime: getRuntime(),
        memory: peakMemory,
        timedOut,
        oomKilled,
      });
    });

    if (input !== null) {
      docker.stdin.on("error", () => {
        // The process may exit before consuming all input.
      });

      docker.stdin.end(input);
    }
  });
}

// =====================================================
// OOM DETECTION
// =====================================================

function inspectOOM(containerName) {
  return new Promise((resolve) => {
    const proc = spawn("docker", [
      "inspect",
      "--format",
      "{{.State.OOMKilled}}",
      containerName,
    ]);

    let output = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.on("error", () => resolve(false));

    proc.on("close", (code) => {
      resolve(code === 0 && output.trim() === "true");
    });
  });
}

// =====================================================
// CONTAINER CLEANUP
// =====================================================

function removeContainer(containerName) {
  const proc = spawn("docker", ["rm", "-f", containerName]);

  proc.on("error", (error) => {
    console.error("Container cleanup failed:", error.message);
  });
}

function cleanup(tempDir) {
  try {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  } catch (error) {
    console.error("Temporary directory cleanup failed:", error.message);
  }
}

module.exports = javaExecutor;
