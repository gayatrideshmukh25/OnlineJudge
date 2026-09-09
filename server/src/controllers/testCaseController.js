const prisma = require("../config/prisma");

const normalizeTestCase = (testcase) => {
  if (!testcase) return testcase;
  return {
    ...testcase,
    expectedOutput: testcase.expectedOutput ?? testcase.expected ?? "",
    expected: testcase.expected ?? testcase.expectedOutput ?? "",
  };
};

const createTestCase = async (req, resp, next) => {
  const form = req.body;
  const problemId = req.params.problemId;
  const { input, expectedOutput, isHidden } = form;

  try {
    if (!input || !expectedOutput || !problemId || isHidden === undefined) {
      resp.status(400).json({
        message:
          "Input, expected output, problem ID, and hidden status are required",
      });
      return;
    }
    const testcase = await prisma.testCase.create({
      data: {
        input,
        expected: expectedOutput,
        isHidden,
        problemId: parseInt(problemId),
      },
    });
    const normalizedTestCase = normalizeTestCase(testcase);
    resp.status(201).json({
      success: true,
      testcase: normalizedTestCase,
      message: "Test case created successfully",
    });
  } catch (error) {
    console.error("createTestCase error:", error);
    next(error);
  }
};
const getTestCases = async (req, resp, next) => {
  const { problemId } = req.params;
  try {
    const testCases = await prisma.testCase.findMany({
      where: { problemId: parseInt(problemId) },
    });
    const normalizedTestCases = testCases.map(normalizeTestCase);
    resp.status(200).json({ success: true, testCases: normalizedTestCases });
  } catch (error) {
    console.error("getTestCases error:", error);
    next(error);
  }
};
const getTestCaseById = async (req, resp, next) => {
  const { id } = req.params;
  try {
    const testcase = await prisma.testCase.findUnique({
      where: { id: parseInt(id) },
    });
    const normalizedTestCase = normalizeTestCase(testcase);
    if (!normalizedTestCase) {
      resp.status(404).json({ success: false, message: "Test case not found" });
      return;
    }
    resp.status(200).json({ success: true, testcase: normalizedTestCase });
  } catch (error) {
    console.error("getTestCaseById error:", error);
    next(error);
  }
};
const updateTestCase = async (req, resp) => {};
const deleteTestCase = async (req, resp) => {
  const { id } = req.params;
  try {
    const deletedTestCase = await prisma.testCase.delete({
      where: { id: parseInt(id) },
    });
    resp
      .status(200)
      .json({ success: true, message: "Test case deleted successfully" });
  } catch (error) {
    console.error("deleteTestCase error:", error);
    next(error);
  }
};

module.exports = {
  createTestCase,
  getTestCases,
  getTestCaseById,
  updateTestCase,
  deleteTestCase,
};
