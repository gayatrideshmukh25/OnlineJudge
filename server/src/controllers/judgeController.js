const prisma = require("../config/prisma");
const executeCode = require("../services/executeCode");
const judgeSubmission = async (req, resp) => {
  const { id } = req.user;
  const { submissionId } = req.params;
  try {
    console.log("at judging controller");
    if (!submissionId) {
      resp.status(400).json({ message: "Submission ID is required" });
      return;
    }
    const submission = await prisma.submission.findUnique({
      where: {
        id: parseInt(submissionId),
      },
    });
    const problemId = submission.problemId;
    if (!submission) {
      resp.status(404).json({ message: "Submission not found" });
      return;
    }
    const problem = await prisma.problem.findUnique({
      where: { id: parseInt(problemId) },
    });
    if (!problem) {
      resp.status(404).json({ message: "Problem not found" });
      return;
    }
    let hiddenTestCases = await prisma.testCase.findMany({
      where: { problemId: parseInt(problemId), isHidden: true },
    });
    if (!hiddenTestCases || hiddenTestCases.length === 0) {
      hiddenTestCases = await prisma.testCase.findMany({
        where: {
          problemId: submission.problemId,
        },
      });
    }
    if (!hiddenTestCases || hiddenTestCases.length === 0) {
      resp
        .status(404)
        .json({ message: "No test cases found for this problem" });
      return;
    }
    console.log("executinh code");
    const result = await executeCode(
      submission.language,
      submission.code,
      hiddenTestCases,
    );
    console.log("result done executing", result);
    await prisma.submission.update({
      where: {
        id: submission.id,
      },
      data: {
        status: result.status,
        runtime: result.runtime,
        memory: result.memory,
      },
    });
    console.log("judged");
    resp.status(200).json({
      success: true,
      message: "Submission judged successfully",
      result,
    });
  } catch (error) {
    console.error(error);
    resp.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getJudgeResult = async (req, resp) => {
  const { id } = req.params;
  try {
    if (!id) {
      resp.status(400).json({ message: "Submission ID is required" });
      return;
    }
    const submission = await prisma.submission.findUnique({
      where: { id: parseInt(id) },
    });
    if (!submission) {
      resp.status(404).json({ message: "Submission not found" });
      return;
    }
    resp.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error(error);
    resp.status(500).json({ success: false, message: "Internal Server error" });
  }
};
module.exports = {
  judgeSubmission,
  getJudgeResult,
};
