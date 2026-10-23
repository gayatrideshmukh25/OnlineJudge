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

// const fs = require("fs");
// const path = require("path");
// const { spawn } = require("child_process");
// const { randomUUID } = require("crypto");

// const JAVA_IMAGE = "eclipse-temurin:17";

// const COMPILE_TIMEOUT = 30000;
// const RUN_TIMEOUT = 5000;

// const MEMORY_LIMIT = "128m";
// const COMPILE_MEMORY_LIMIT = "256m";

// const CPU_LIMIT = "0.5";
// const COMPILE_CPU_LIMIT = "1";

// const javaExecutor = async (code, testCases) => {
//   const folderName = randomUUID();
//   const tempDir = path.join(__dirname, "../../temp", folderName);

//   fs.mkdirSync(tempDir, { recursive: true });

//   const javaFile = path.join(tempDir, "Main.java");

//   try {
//     fs.writeFileSync(javaFile, code);

//     const dockerDir = path.resolve(tempDir).replace(/\\/g, "/");

//     // 1. Compile Java once.
//     const compileResult = await runDocker(
//       `oj-java-compile-${folderName}`,
//       dockerDir,
//       ["javac", "Main.java"],
//       null,
//       COMPILE_TIMEOUT,
//       COMPILE_MEMORY_LIMIT,
//       COMPILE_CPU_LIMIT,
//     );

//     if (compileResult.timedOut) {
//       return {
//         success: false,
//         status: "Compilation Error",
//         error: "Compilation time exceeded the limit",
//         runtime: compileResult.runtime,
//         memory: compileResult.memory,
//         passed: 0,
//         total: testCases.length,
//         results: [],
//       };
//     }

//     if (compileResult.oomKilled) {
//       return {
//         success: false,
//         status: "Compilation Error",
//         error: "Compilation exceeded its memory limit",
//         runtime: compileResult.runtime,
//         memory: compileResult.memory,
//         passed: 0,
//         total: testCases.length,
//         results: [],
//       };
//     }

//     if (compileResult.exitCode !== 0) {
//       return {
//         success: false,
//         status: "Compilation Error",
//         error: compileResult.stderr || "Compilation failed",
//         runtime: compileResult.runtime,
//         memory: compileResult.memory,
//         passed: 0,
//         total: testCases.length,
//         results: [],
//       };
//     }

//     // 2. Execute each test case in a separate container.
//     const results = [];
//     let maxRuntime = 0;
//     let maxMemory = 0;

//     for (let i = 0; i < testCases.length; i++) {
//       const testCase = testCases[i];

//       const runResult = await runDocker(
//         `oj-java-run-${folderName}-${i}`,
//         dockerDir,
//         [
//           "sh",
//           "-c",
//           'java -Xms16m -Xmx96m Main; code=$?; touch /tmp/java-finished; sleep 3; exit "$code"',
//         ],
//         testCase.input || "",
//         RUN_TIMEOUT,
//         MEMORY_LIMIT,
//         CPU_LIMIT,
//       );

//       maxRuntime = Math.max(maxRuntime, runResult.runtime);
//       maxMemory = Math.max(maxMemory, runResult.memory);

//       // Timeout takes priority over the exit code.
//       if (runResult.timedOut) {
//         return {
//           success: false,
//           status: "Time Limit Exceeded",
//           error: `Execution exceeded ${RUN_TIMEOUT} ms`,
//           runtime: maxRuntime,
//           memory: maxMemory,
//           passed: 0,
//           total: testCases.length,
//           results: [],
//         };
//       }

//       if (runResult.oomKilled) {
//         return {
//           success: false,
//           status: "Memory Limit Exceeded",
//           error: `Execution exceeded the container memory limit of ${MEMORY_LIMIT}`,
//           runtime: maxRuntime,
//           memory: maxMemory,
//           passed: 0,
//           total: testCases.length,
//           results: [],
//         };
//       }

//       if (runResult.exitCode !== 0) {
//         return {
//           success: false,
//           status: "Runtime Error",
//           error:
//             runResult.stderr ||
//             `Program exited with code ${runResult.exitCode}`,
//           output: runResult.stdout,
//           runtime: maxRuntime,
//           memory: maxMemory,
//           passed: 0,
//           total: testCases.length,
//           results: [],
//         };
//       }

//       results.push({
//         testCase,
//         output: runResult.stdout,
//         runtime: runResult.runtime,
//         memory: runResult.memory,
//       });
//     }

//     return {
//       success: true,
//       runtime: maxRuntime,
//       memory: maxMemory,
//       passed: results.length,
//       total: testCases.length,
//       results,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       status: "System Error",
//       error: error.message,
//       runtime: 0,
//       memory: 0,
//       passed: 0,
//       total: testCases.length,
//       results: [],
//     };
//   } finally {
//     cleanup(tempDir);
//   }
// };

// // =====================================================
// // DOCKER RUNNER
// // =====================================================

// function runDocker(
//   containerName,
//   dockerDir,
//   command,
//   input,
//   timeout,
//   memory,
//   cpus,
// ) {
//   return new Promise((resolve) => {
//     const start = process.hrtime.bigint();

//     const args = [
//       "run",
//       "-i",
//       "--name",
//       containerName,
//       "--network",
//       "none",
//       "--memory",
//       memory,
//       "--memory-swap",
//       memory,
//       "--cpus",
//       cpus,
//       "-v",
//       `${dockerDir}:/app`,
//       "-w",
//       "/app",
//       JAVA_IMAGE,
//       ...command,
//     ];

//     const docker = spawn("docker", args);

//     let stdout = "";
//     let stderr = "";
//     let timedOut = false;
//     let peakMemory = 0;
//     let settled = false;
//     let statsInFlight = false;

//     const getRuntime = () => Number(process.hrtime.bigint() - start) / 1e6;

//     const finish = (result) => {
//       if (settled) return;
//       settled = true;
//       resolve(result);
//     };

//     // Sample container memory while it is running.
//     const statsTimer = setInterval(() => {
//       if (statsInFlight || settled) return;
//       statsInFlight = true;

//       const stats = spawn("docker", [
//         "stats",
//         "--no-stream",
//         "--format",
//         "{{.MemUsage}}",
//         containerName,
//       ]);

//       let statsOutput = "";

//       stats.stdout.on("data", (data) => {
//         statsOutput += data.toString();
//       });

//       stats.on("error", () => {
//         statsInFlight = false;
//       });

//       stats.on("close", (code) => {
//         statsInFlight = false;

//         if (code !== 0) return;

//         const match = statsOutput.match(/([\d.]+)\s*(B|KiB|MiB|GiB)/);

//         if (!match) return;

//         const value = parseFloat(match[1]);
//         const unit = match[2];

//         const factors = {
//           B: 1 / (1024 * 1024),
//           KiB: 1 / 1024,
//           MiB: 1,
//           GiB: 1024,
//         };

//         const memoryMB = value * factors[unit];

//         peakMemory = Math.max(peakMemory, memoryMB);
//         console.log({
//           container: containerName,
//           sampledMemoryMB: memoryMB.toFixed(2),
//           peakMemoryMB: peakMemory.toFixed(2),
//         });
//       });
//     }, 100);

//     const clearMonitoring = () => {
//       clearTimeout(timeoutTimer);
//       clearInterval(statsTimer);
//     };

//     // Kill the container when its deadline expires.
//     const timeoutTimer = setTimeout(() => {
//       timedOut = true;

//       const killer = spawn("docker", ["kill", containerName]);

//       killer.on("error", (error) => {
//         console.error("Docker kill failed:", error.message);
//       });
//     }, timeout);

//     docker.stdout.on("data", (data) => {
//       stdout += data.toString();
//     });

//     docker.stderr.on("data", (data) => {
//       stderr += data.toString();
//     });

//     docker.on("error", (error) => {
//       clearMonitoring();

//       removeContainer(containerName);

//       finish({
//         exitCode: -1,
//         stdout,
//         stderr: error.message,
//         runtime: getRuntime(),
//         memory: peakMemory,
//         timedOut: false,
//         oomKilled: false,
//       });
//     });

//     docker.on("close", async (exitCode) => {
//       clearTimeout(timeoutTimer);
//       clearInterval(statsTimer);

//       const peakMemory = await getPeakMemoryFromContainer(containerName);

//       peakMemory = Math.max(peakMemory, finalMemory);

//       const oomKilled = await inspectOOM(containerName);

//       removeContainer(containerName);

//       finish({
//         exitCode,
//         stdout,
//         stderr,
//         runtime: getRuntime(),
//         memory: peakMemory,
//         timedOut,
//         oomKilled,
//       });
//     });

//     if (input !== null) {
//       docker.stdin.on("error", () => {
//         // The process may exit before consuming all input.
//       });

//       docker.stdin.end(input);
//     }
//   });
// }
// function getPeakMemoryFromContainer(containerName) {
//   return new Promise((resolve) => {
//     const proc = spawn("docker", [
//       "exec",
//       containerName,
//       "sh",
//       "-c",
//       "cat /sys/fs/cgroup/memory.peak",
//     ]);

//     let output = "";

//     proc.stdout.on("data", (data) => {
//       output += data.toString();
//     });

//     proc.on("error", () => resolve(0));

//     proc.on("close", (code) => {
//       if (code !== 0) {
//         resolve(0);
//         return;
//       }

//       const bytes = Number(output.trim());

//       resolve(Number.isFinite(bytes) && bytes >= 0 ? bytes / (1024 * 1024) : 0);
//     });
//   });
// }
// function getDockerMemory(containerName) {
//   return new Promise((resolve) => {
//     const stats = spawn("docker", [
//       "stats",
//       "--no-stream",
//       "--format",
//       "{{.MemUsage}}",
//       containerName,
//     ]);

//     let output = "";

//     stats.stdout.on("data", (data) => {
//       output += data.toString();
//     });

//     stats.on("error", () => resolve(0));

//     stats.on("close", (code) => {
//       if (code !== 0) {
//         resolve(0);
//         return;
//       }

//       const match = output.match(/([\d.]+)\s*(B|KiB|MiB|GiB)/);

//       if (!match) {
//         console.log("Unable to parse Docker memory:", output);
//         resolve(0);
//         return;
//       }

//       const value = parseFloat(match[1]);

//       const factors = {
//         B: 1 / (1024 * 1024),
//         KiB: 1 / 1024,
//         MiB: 1,
//         GiB: 1024,
//       };

//       resolve(value * factors[match[2]]);
//     });
//   });
// }

// // =====================================================
// // DOCKER OOM DETECTION
// // =====================================================

// function inspectOOM(containerName) {
//   return new Promise((resolve) => {
//     const proc = spawn("docker", [
//       "inspect",
//       "--format",
//       "{{.State.OOMKilled}}",
//       containerName,
//     ]);

//     let output = "";

//     proc.stdout.on("data", (data) => {
//       output += data.toString();
//     });

//     proc.on("error", () => resolve(false));

//     proc.on("close", (code) => {
//       resolve(code === 0 && output.trim() === "true");
//     });
//   });
// }

// // =====================================================
// // CONTAINER CLEANUP
// // =====================================================

// function removeContainer(containerName) {
//   const proc = spawn("docker", ["rm", "-f", containerName]);

//   proc.on("error", (error) => {
//     console.error("Container cleanup failed:", error.message);
//   });
// }

// function cleanup(tempDir) {
//   try {
//     fs.rmSync(tempDir, {
//       recursive: true,
//       force: true,
//     });
//   } catch (error) {
//     console.error("Temporary directory cleanup failed:", error.message);
//   }
// }

// module.exports = javaExecutor;

// const fs = require("fs");
// const path = require("path");
// const { spawn } = require("child_process");
// const { randomUUID } = require("crypto");

// const JAVA_IMAGE = "eclipse-temurin:17";

// const COMPILE_TIMEOUT = 30000;
// const RUN_TIMEOUT = 5000;

// const MEMORY_LIMIT = "128m";
// const CPU_LIMIT = "0.5";

// const javaExecutor = async (code, testCases) => {
//   const folderName = randomUUID();

//   const tempDir = path.join(__dirname, "../../temp", folderName);

//   fs.mkdirSync(tempDir, { recursive: true });

//   const javaFile = path.join(tempDir, "Main.java");

//   try {
//     fs.writeFileSync(javaFile, code);

//     const dockerDir = path.resolve(tempDir).replace(/\\/g, "/");

//     // =====================================================
//     // COMPILE ONCE
//     // =====================================================

//     console.log("Compiling Java code...");

//     const compileContainer = `oj-java-compile-${folderName}`;

//     const compileResult = await runDocker(
//       compileContainer,
//       dockerDir,
//       ["javac", "Main.java"],
//       null,
//       COMPILE_TIMEOUT,
//       "256m",
//       "1",
//     );

//     if (compileResult.timedOut) {
//       cleanup(tempDir);

//       return {
//         success: false,
//         status: "Compilation Error",
//         error: "Compilation time exceeded the limit",
//         runtime: compileResult.runtime,
//         memory: 0,
//         passed: 0,
//         total: testCases.length,
//         testResults: [],
//       };
//     }

//     if (compileResult.exitCode !== 0) {
//       cleanup(tempDir);

//       return {
//         success: false,
//         status: "Compilation Error",
//         error: compileResult.stderr || "Compilation failed",
//         runtime: compileResult.runtime,
//         memory: 0,
//         passed: 0,
//         total: testCases.length,
//         testResults: [],
//       };
//     }

//     console.log("Java compilation successful");

//     // =====================================================
//     // RUN TEST CASES
//     // =====================================================

//     const results = [];

//     let maxRuntime = 0;
//     let maxMemory = 0;

//     for (let i = 0; i < testCases.length; i++) {
//       const testCase = testCases[i];

//       console.log(`Running test case ${i + 1}/${testCases.length}`);

//       const containerName = `oj-java-run-${folderName}-${i}`;

//       const runResult = await runDocker(
//         containerName,
//         dockerDir,
//         ["java", "-Xmx96m", "Main"],
//         testCase.input || "",
//         RUN_TIMEOUT,
//         MEMORY_LIMIT,
//         CPU_LIMIT,
//       );
//       maxRuntime = Math.max(maxRuntime, runResult.runtime);
//       maxMemory = Math.max(maxMemory, runResult.memory);

//       // ---------------------------------------------------
//       // TIME LIMIT
//       // ---------------------------------------------------

//       if (runResult.timedOut) {
//         cleanup(tempDir);

//         return {
//           success: false,
//           status: "Time Limit Exceeded",
//           error: `Execution time exceeded ${RUN_TIMEOUT} ms`,
//           runtime: runResult.runtime,
//           memory: runResult.memory,
//           passed: 0,
//           total: testCases.length,
//           testResults: [],
//         };
//       }

//       // ---------------------------------------------------
//       // MEMORY LIMIT
//       // ---------------------------------------------------

//       if (runResult.exitCode === 137) {
//         cleanup(tempDir);

//         return {
//           success: false,
//           status: "Memory Limit Exceeded",
//           error: `Memory limit of ${MEMORY_LIMIT} exceeded`,
//           runtime: runResult.runtime,
//           memory: runResult.memory,
//           passed: 0,
//           total: testCases.length,
//           testResults: [],
//         };
//       }

//       // ---------------------------------------------------
//       // RUNTIME ERROR
//       // ---------------------------------------------------

//       if (runResult.exitCode !== 0) {
//         cleanup(tempDir);

//         return {
//           success: false,
//           status: "Runtime Error",
//           output: runResult.stdout,
//           error:
//             runResult.stderr ||
//             `Program exited with code ${runResult.exitCode}`,
//           runtime: runResult.runtime,
//           memory: runResult.memory,
//           passed: 0,
//           total: testCases.length,
//           testResults: [],
//         };
//       }

//       // ---------------------------------------------------
//       // SAVE RESULT
//       // ---------------------------------------------------

//       results.push({
//         testCase,
//         output: runResult.stdout,
//         runtime: runResult.runtime,
//         memory: runResult.memory,
//       });
//     }

//     cleanup(tempDir);

//     return {
//       success: true,
//       runtime: maxRuntime,
//       memory: maxMemory,
//       passed: results.length,
//       total: testCases.length,
//       results,
//     };
//   } catch (error) {
//     cleanup(tempDir);

//     return {
//       success: false,
//       status: "System Error",
//       error: error.message,
//       runtime: 0,
//       memory: 0,
//       passed: 0,
//       total: testCases.length,
//       testResults: [],
//     };
//   }
// };

// // =========================================================
// // DOCKER RUNNER
// // =========================================================

// function runDocker(
//   containerName,
//   dockerDir,
//   command,
//   input,
//   timeout,
//   memory,
//   cpus,
// ) {
//   return new Promise((resolve) => {
//     const start = Date.now();

//     const args = [
//       "run",
//       "-i",
//       "--name",
//       containerName,
//       "--network",
//       "none",
//       "--memory",
//       memory,
//       "--cpus",
//       cpus,
//       "-v",
//       `${dockerDir}:/app`,
//       "-w",
//       "/app",
//       JAVA_IMAGE,
//       ...command,
//     ];

//     console.log("Docker command:", "docker", ...args);

//     const docker = spawn("docker", args);

//     let stdout = "";
//     let stderr = "";
//     let timedOut = false;
//     let peakMemory = 0;

//     // ============================================
//     // MEMORY MONITORING
//     // ============================================

//     const statsTimer = setInterval(() => {
//       const stats = spawn("docker", [
//         "stats",
//         "--no-stream",
//         "--format",
//         "{{.MemUsage}}",
//         containerName,
//       ]);

//       let statsOutput = "";

//       stats.stdout.on("data", (data) => {
//         statsOutput += data.toString();
//       });

//       stats.on("close", () => {
//         console.log("RAW MEMORY:", statsOutput.trim());
//         const match = statsOutput.match(/([\d.]+)\s*(B|KiB|MiB|GiB)/);

//         if (!match) {
//           return;
//         }

//         const value = parseFloat(match[1]);
//         const unit = match[2];

//         let memoryMB;

//         switch (unit) {
//           case "B":
//             memoryMB = value / (1024 * 1024);
//             break;

//           case "KiB":
//             memoryMB = value / 1024;
//             break;

//           case "MiB":
//             memoryMB = value;
//             break;

//           case "GiB":
//             memoryMB = value * 1024;
//             break;

//           default:
//             memoryMB = 0;
//         }

//         peakMemory = Math.max(peakMemory, memoryMB);

//         console.log(
//           `Memory usage: ${memoryMB.toFixed(2)} MB | Peak: ${peakMemory.toFixed(2)} MB`,
//         );
//       });
//     }, 250);

//     // ============================================
//     // STDOUT
//     // ============================================

//     docker.stdout.on("data", (data) => {
//       stdout += data.toString();
//     });

//     // ============================================
//     // STDERR
//     // ============================================

//     docker.stderr.on("data", (data) => {
//       stderr += data.toString();
//     });

//     // ============================================
//     // TIMEOUT
//     // ============================================

//     const timer = setTimeout(() => {
//       timedOut = true;

//       console.log(`Killing container: ${containerName}`);

//       try {
//         const killProcess = spawn("docker", ["kill", containerName]);

//         killProcess.on("error", (error) => {
//           console.error("Failed to kill Docker container:", error.message);
//         });
//       } catch (error) {
//         console.error("Docker kill error:", error.message);
//       }
//     }, timeout);

//     // ============================================
//     // DOCKER ERROR
//     // ============================================

//     docker.on("error", (error) => {
//       clearTimeout(timer);
//       clearInterval(statsTimer);

//       removeContainer(containerName);

//       resolve({
//         exitCode: -1,
//         stdout,
//         stderr: error.message,
//         runtime: Date.now() - start,
//         memory: peakMemory,
//         timedOut: false,
//       });
//     });

//     // ============================================
//     // DOCKER FINISHED
//     // ============================================

//     docker.on("close", (exitCode) => {
//       clearTimeout(timer);

//       /*
//        * Take one final memory reading before
//        * removing the container.
//        */
//       const finalStats = spawn("docker", [
//         "stats",
//         "--no-stream",
//         "--format",
//         "{{.MemUsage}}",
//         containerName,
//       ]);

//       let finalStatsOutput = "";

//       finalStats.stdout.on("data", (data) => {
//         finalStatsOutput += data.toString();
//       });

//       finalStats.on("close", () => {
//         console.log("RAW FINAL MEMORY:", finalStatsOutput.trim());
//         const match = finalStatsOutput.match(/([\d.]+)\s*(B|KiB|MiB|GiB)/);

//         if (match) {
//           const value = parseFloat(match[1]);
//           const unit = match[2];

//           let memoryMB = value;

//           if (unit === "B") {
//             memoryMB = value / (1024 * 1024);
//           } else if (unit === "KiB") {
//             memoryMB = value / 1024;
//           } else if (unit === "GiB") {
//             memoryMB = value * 1024;
//           }

//           peakMemory = Math.max(peakMemory, memoryMB);
//         }

//         clearInterval(statsTimer);

//         console.log(`Final memory: ${peakMemory.toFixed(2)} MB`);

//         removeContainer(containerName);

//         resolve({
//           exitCode,
//           stdout,
//           stderr,
//           runtime: Date.now() - start,
//           memory: peakMemory,
//           timedOut,
//         });
//       });
//     });

//     // ============================================
//     // SEND INPUT
//     // ============================================

//     if (input !== null) {
//       docker.stdin.write(input);
//       docker.stdin.end();
//     }
//   });
// }
// function removeContainer(containerName) {
//   try {
//     const removeProcess = spawn("docker", ["rm", "-f", containerName]);

//     removeProcess.on("error", (error) => {
//       console.error("Failed to remove container:", error.message);
//     });
//   } catch (error) {
//     console.error("Container removal error:", error.message);
//   }
// }

// // function runDocker(
// //   containerName,
// //   dockerDir,
// //   command,
// //   input,
// //   timeout,
// //   memory,
// //   cpus,
// // ) {
// //   return new Promise((resolve) => {
// //     const start = Date.now();

// //     const args = [
// //       "run",
// //       "--rm",
// //       "--name",
// //       containerName,
// //       "--network",
// //       "none",
// //       "--memory",
// //       memory,
// //       "--cpus",
// //       cpus,
// //       "-v",
// //       `${dockerDir}:/app`,
// //       "-w",
// //       "/app",
// //     ];

// //     if (input !== null) {
// //       args.push("-i");
// //     }

// //     args.push(JAVA_IMAGE, ...command);

// //     console.log("Docker command:", "docker", ...args);

// //     const docker = spawn("docker", args);

// //     let stdout = "";
// //     let stderr = "";
// //     let timedOut = false;
// //     let peakMemory = 0;

// //     // ---------------------------------------------------
// //     // GET DOCKER MEMORY USAGE
// //     // ---------------------------------------------------

// //     const statsTimer = setInterval(() => {
// //       const stats = spawn("docker", [
// //         "stats",
// //         "--no-stream",
// //         "--format",
// //         "{{.MemUsage}}",
// //         containerName,
// //       ]);

// //       let statsOutput = "";

// //       stats.stdout.on("data", (data) => {
// //         statsOutput += data.toString();
// //       });

// //       stats.on("close", () => {
// //         /*
// //           Example Docker output:

// //           25.4MiB / 128MiB

// //           We only need the first value.
// //         */
// //         console.log("Docker memory:", statsOutput.trim());
// //         const match = statsOutput.match(/([\d.]+)\s*(B|KiB|MiB|GiB)/);

// //         if (!match) return;

// //         const value = parseFloat(match[1]);
// //         const unit = match[2];

// //         let memoryMB = value;

// //         if (unit === "B") {
// //           memoryMB = value / (1024 * 1024);
// //         } else if (unit === "KiB") {
// //           memoryMB = value / 1024;
// //         } else if (unit === "MiB") {
// //           memoryMB = value;
// //         } else if (unit === "GiB") {
// //           memoryMB = value * 1024;
// //         }

// //         // Keep maximum memory used
// //         peakMemory = Math.max(peakMemory, memoryMB);
// //       });
// //     }, 50);

// //     // ---------------------------------------------------
// //     // STDOUT
// //     // ---------------------------------------------------

// //     docker.stdout.on("data", (data) => {
// //       stdout += data.toString();
// //     });

// //     // ---------------------------------------------------
// //     // STDERR
// //     // ---------------------------------------------------

// //     docker.stderr.on("data", (data) => {
// //       stderr += data.toString();
// //     });

// //     // ---------------------------------------------------
// //     // TIMEOUT
// //     // ---------------------------------------------------

// //     const timer = setTimeout(() => {
// //       timedOut = true;

// //       console.log(`Killing container: ${containerName}`);

// //       try {
// //         const killProcess = spawn("docker", ["kill", containerName]);

// //         killProcess.on("error", (error) => {
// //           console.error("Failed to kill Docker container:", error.message);
// //         });
// //       } catch (error) {
// //         console.error("Docker kill error:", error.message);
// //       }
// //     }, timeout);
// //     // ---------------------------------------------------
// //     // DOCKER ERROR
// //     // ---------------------------------------------------

// //     docker.on("error", (error) => {
// //       clearTimeout(timer);
// //       clearInterval(statsTimer);

// //       resolve({
// //         exitCode: -1,
// //         stdout,
// //         stderr: error.message,
// //         runtime: Date.now() - start,
// //         memory: peakMemory,
// //         timedOut: false,
// //       });
// //     });

// //     // ---------------------------------------------------
// //     // DOCKER FINISHED
// //     // ---------------------------------------------------

// //     docker.on("close", (exitCode) => {
// //       clearTimeout(timer);
// //       clearInterval(statsTimer);

// //       resolve({
// //         exitCode,
// //         stdout,
// //         stderr,
// //         runtime: Date.now() - start,
// //         memory: peakMemory,
// //         timedOut,
// //       });
// //     });

// //     // ---------------------------------------------------
// //     // SEND INPUT
// //     // ---------------------------------------------------

// //     if (input !== null) {
// //       docker.stdin.write(input);
// //       docker.stdin.end();
// //     }
// //   });
// // }

// function cleanup(tempDir) {
//   try {
//     if (fs.existsSync(tempDir)) {
//       fs.rmSync(tempDir, {
//         recursive: true,
//         force: true,
//       });
//     }
//   } catch (error) {
//     console.error("Cleanup failed:", error.message);
//   }
// }

// module.exports = javaExecutor;
