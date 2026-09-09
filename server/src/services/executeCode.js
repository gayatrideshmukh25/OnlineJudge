const executeJava = require("../executors/javaExecutor");
// const executeCpp = require("../executors/cppExecutor");
// const executePython = require("../executors/pythonExecutor");

const executeCode = async (language, code, testCases) => {
  let executor;

  // Select executor based on language
  switch (language) {
    case "java":
      executor = executeJava;
      break;

    // case "cpp":
    //   executor = executeCpp;
    //   break;

    // case "python":
    //   executor = executePython;
    //   break;

    default:
      throw new Error("Language not supported");
  }

  /*
   * The executor now receives ALL test cases.
   *
   * Java will:
   * 1. Compile the code only once
   * 2. Run each test case
   * 3. Return the result of each test case
   *
   * We still keep the judging logic here.
   */

  const execution = await executor(code, testCases);

  let passed = 0;
  let totalRuntime = 0;
  let maxMemory = 0;

  const testResults = [];

  // If compilation/runtime/TLE/MLE occurred
  if (!execution.success && execution.status !== "Wrong Answer") {
    return execution;
  }

  // Process results returned by executor
  for (const result of execution.results) {
    totalRuntime += result.runtime || 0;

    maxMemory = Math.max(maxMemory, result.memory || 0);

    const testCase = result.testCase;

    const actualOutput = (result.output || "").trim();
    const expectedOutput = (testCase.expected || "").trim();

    const isPassed = actualOutput === expectedOutput;

    testResults.push({
      input: testCase.input,
      expected: testCase.expected,
      actual: result.output || "",
      passed: isPassed,
    });

    console.log("testResults", testResults);

    if (!isPassed) {
      return {
        success: false,
        status: "Wrong Answer",
        output: result.output || "",
        expected: testCase.expected,
        runtime: totalRuntime,
        memory: maxMemory,
        passed,
        total: testCases.length,
        testResults,
      };
    }

    passed++;
  }

  return {
    success: true,
    status: "Accepted",
    runtime: totalRuntime,
    memory: maxMemory,
    passed,
    total: testCases.length,
    testResults,
  };
};

module.exports = executeCode;
// const executeJava = require("../executors/javaExecutor");
// const executeCpp = require("../executors/cppExecutor");
// const executePython = require("../executors/pythonExecutor");

// const executeCode = async (language, code, testCases) => {
//   let executor;

//   switch (language) {
//     case "java":
//       executor = executeJava;
//       break;

//     case "cpp":
//       executor = executeCpp;
//       break;

//     case "python":
//       executor = executePython;
//       break;

//     default:
//       throw new Error("Language not supported");
//   }

//   let passed = 0;
//   let totalRuntime = 0;
//   let maxMemory = 0;
//   const testResults = [];

//   for (const testCase of testCases) {
//     const result = await executor(code, testCase.input);

//     if (!result.success) {
//       return result;
//     }

//     totalRuntime += result.runtime;
//     maxMemory = Math.max(maxMemory, result.memory);

//     if (result.output.trim() === testCase.expected.trim()) {
//       passed++;
//     } else {
//       return {
//         success: false,
//         status: "Wrong Answer",
//         output: result.output,
//         expected: testCase.expected,
//         runtime: totalRuntime,
//         memory: maxMemory,
//         passed,
//         total: testCases.length,
//       };
//     }
//   }

//   return {
//     success: true,
//     status: "Accepted",
//     runtime: totalRuntime,
//     memory: maxMemory,
//     passed,
//     total: testCases.length,
//   };
// };

// module.exports = executeCode;
