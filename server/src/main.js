const executeCode = require("./services/executeCode");

async function runTest(name, language, code, testCases) {
  console.log(`\n========== ${name} ==========`);

  console.log("Language:", language);
  console.log("testCases is array:", Array.isArray(testCases));

  if (!Array.isArray(testCases)) {
    console.error("Fix required: testCases must be an array.");
    return;
  }

  try {
    const result = await executeCode(language, code, testCases);
    console.dir(result, { depth: null });
  } catch (error) {
    console.error("Execution failed:", error.message);
  }
}

async function main() {
  await runTest("Wrong Answer", "python", "print(100)", [
    { input: "", expected: "5" },
  ]);

  // Test 4: Syntax Error
  await runTest("Syntax Error", "python", `if True print("hello")`, [
    { input: "", expected: "hello" },
  ]);
}

main().catch(console.error);
