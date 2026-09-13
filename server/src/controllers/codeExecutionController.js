const executeCode = require("../services/executeCode");
const prisma = require("../config/prisma");
const runCode = async (req, resp) => {
  const { code, language, problemId } = req.body;
  try {
    if (!code || !language) {
      resp.status(400).json({ message: "Code and language are required" });
      return;
    }
    const sampleTestCases = await prisma.testCase.findMany({
      where: {
        problemId: parseInt(problemId),
        isHidden: false,
      },
    });

    const result = await executeCode(language, code, sampleTestCases);
    console.log("Memory:", result.memory);
    console.log("result done executing", result);
    resp.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(error);
    resp.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  runCode,
};
