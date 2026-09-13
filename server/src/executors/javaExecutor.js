const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { randomUUID } = require("crypto");

const JAVA_IMAGE = "eclipse-temurin:17";

const COMPILE_TIMEOUT = 15000;
const RUN_TIMEOUT = 5000;

const MEMORY_LIMIT = "128m";
const CPU_LIMIT = "0.5";

const javaExecutor = async (code, testCases) => {
  const folderName = randomUUID();

  const tempDir = path.join(__dirname, "../../temp", folderName);

  fs.mkdirSync(tempDir, { recursive: true });

  const javaFile = path.join(tempDir, "Main.java");

  try {
    fs.writeFileSync(javaFile, code);

    const dockerDir = path.resolve(tempDir).replace(/\\/g, "/");

    // =====================================================
    // COMPILE ONCE
    // =====================================================

    console.log("Compiling Java code...");

    const compileContainer = `oj-java-compile-${folderName}`;

    const compileResult = await runDocker(
      compileContainer,
      dockerDir,
      ["javac", "Main.java"],
      null,
      COMPILE_TIMEOUT,
      "256m",
      "1",
    );

    if (compileResult.timedOut) {
      cleanup(tempDir);

      return {
        success: false,
        status: "Compilation Error",
        error: "Compilation time exceeded the limit",
        runtime: compileResult.runtime,
        memory: 0,
        passed: 0,
        total: testCases.length,
        testResults: [],
      };
    }

    if (compileResult.exitCode !== 0) {
      cleanup(tempDir);

      return {
        success: false,
        status: "Compilation Error",
        error: compileResult.stderr || "Compilation failed",
        runtime: compileResult.runtime,
        memory: 0,
        passed: 0,
        total: testCases.length,
        testResults: [],
      };
    }

    console.log("Java compilation successful");

    // =====================================================
    // RUN TEST CASES
    // =====================================================

    const results = [];

    let maxRuntime = 0;
    let maxMemory = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      console.log(`Running test case ${i + 1}/${testCases.length}`);

      const containerName = `oj-java-run-${folderName}-${i}`;

      const runResult = await runDocker(
        containerName,
        dockerDir,
        ["java", "-Xmx96m", "Main"],
        testCase.input || "",
        RUN_TIMEOUT,
        MEMORY_LIMIT,
        CPU_LIMIT,
      );
      maxRuntime = Math.max(maxRuntime, runResult.runtime);
      maxMemory = Math.max(maxMemory, runResult.memory);

      // ---------------------------------------------------
      // TIME LIMIT
      // ---------------------------------------------------

      if (runResult.timedOut) {
        cleanup(tempDir);

        return {
          success: false,
          status: "Time Limit Exceeded",
          error: `Execution time exceeded ${RUN_TIMEOUT} ms`,
          runtime: runResult.runtime,
          memory: runResult.memory,
          passed: 0,
          total: testCases.length,
          testResults: [],
        };
      }

      // ---------------------------------------------------
      // MEMORY LIMIT
      // ---------------------------------------------------

      if (runResult.exitCode === 137) {
        cleanup(tempDir);

        return {
          success: false,
          status: "Memory Limit Exceeded",
          error: `Memory limit of ${MEMORY_LIMIT} exceeded`,
          runtime: runResult.runtime,
          memory: runResult.memory,
          passed: 0,
          total: testCases.length,
          testResults: [],
        };
      }

      // ---------------------------------------------------
      // RUNTIME ERROR
      // ---------------------------------------------------

      if (runResult.exitCode !== 0) {
        cleanup(tempDir);

        return {
          success: false,
          status: "Runtime Error",
          output: runResult.stdout,
          error:
            runResult.stderr ||
            `Program exited with code ${runResult.exitCode}`,
          runtime: runResult.runtime,
          memory: runResult.memory,
          passed: 0,
          total: testCases.length,
          testResults: [],
        };
      }

      // ---------------------------------------------------
      // SAVE RESULT
      // ---------------------------------------------------

      results.push({
        testCase,
        output: runResult.stdout,
        runtime: runResult.runtime,
        memory: runResult.memory,
      });
    }

    cleanup(tempDir);

    return {
      success: true,
      runtime: maxRuntime,
      memory: maxMemory,
      passed: results.length,
      total: testCases.length,
      results,
    };
  } catch (error) {
    cleanup(tempDir);

    return {
      success: false,
      status: "System Error",
      error: error.message,
      runtime: 0,
      memory: 0,
      passed: 0,
      total: testCases.length,
      testResults: [],
    };
  }
};

// =========================================================
// DOCKER RUNNER
// =========================================================
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
    const start = Date.now();

    const args = [
      "run",
      "--rm",
      "--name",
      containerName,
      "--network",
      "none",
      "--memory",
      memory,
      "--cpus",
      cpus,
      "-v",
      `${dockerDir}:/app`,
      "-w",
      "/app",
    ];

    if (input !== null) {
      args.push("-i");
    }

    args.push(JAVA_IMAGE, ...command);

    console.log("Docker command:", "docker", ...args);

    const docker = spawn("docker", args);

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let peakMemory = 0;

    // ---------------------------------------------------
    // GET DOCKER MEMORY USAGE
    // ---------------------------------------------------

    const statsTimer = setInterval(() => {
      const stats = spawn("docker", [
        "stats",
        "--no-stream",
        "--format",
        "{{.MemUsage}}",
        containerName,
      ]);

      let statsOutput = "";

      stats.stdout.on("data", (data) => {
        statsOutput += data.toString();
      });

      stats.on("close", () => {
        /*
          Example Docker output:

          25.4MiB / 128MiB

          We only need the first value.
        */

        const match = statsOutput.match(/([\d.]+)\s*(B|KiB|MiB|GiB)/);

        if (!match) return;

        const value = parseFloat(match[1]);
        const unit = match[2];

        let memoryMB = value;

        if (unit === "B") {
          memoryMB = value / (1024 * 1024);
        } else if (unit === "KiB") {
          memoryMB = value / 1024;
        } else if (unit === "MiB") {
          memoryMB = value;
        } else if (unit === "GiB") {
          memoryMB = value * 1024;
        }

        // Keep maximum memory used
        peakMemory = Math.max(peakMemory, memoryMB);
      });
    }, 50);

    // ---------------------------------------------------
    // STDOUT
    // ---------------------------------------------------

    docker.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    // ---------------------------------------------------
    // STDERR
    // ---------------------------------------------------

    docker.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // ---------------------------------------------------
    // TIMEOUT
    // ---------------------------------------------------

    const timer = setTimeout(() => {
      timedOut = true;

      console.log(`Killing container: ${containerName}`);

      spawn("docker", ["kill", containerName]);
    }, timeout);

    // ---------------------------------------------------
    // DOCKER ERROR
    // ---------------------------------------------------

    docker.on("error", (error) => {
      clearTimeout(timer);
      clearInterval(statsTimer);

      resolve({
        exitCode: -1,
        stdout,
        stderr: error.message,
        runtime: Date.now() - start,
        memory: peakMemory,
        timedOut: false,
      });
    });

    // ---------------------------------------------------
    // DOCKER FINISHED
    // ---------------------------------------------------

    docker.on("close", (exitCode) => {
      clearTimeout(timer);
      clearInterval(statsTimer);

      resolve({
        exitCode,
        stdout,
        stderr,
        runtime: Date.now() - start,
        memory: peakMemory,
        timedOut,
      });
    });

    // ---------------------------------------------------
    // SEND INPUT
    // ---------------------------------------------------

    if (input !== null) {
      docker.stdin.write(input);
      docker.stdin.end();
    }
  });
}

module.exports = javaExecutor;
