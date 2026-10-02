const prisma = require("../config/prisma");
const { getCodeReview } = require("../services/aiService");

exports.getReview = async (req, resp, next) => {
  const { submissionId } = req.body;
  if (!submissionId) {
    return resp.status(400).json({ message: "submissionId is required" });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        problem: true,
        aiReview: true,
      },
    });
    if (!submission) {
      return resp.status(404).json({ message: "Submission not found" });
    }

    if (submission.aiReview) {
      return resp.status(200).json({ result: submission.aiReview.result });
    }
    const response = await getCodeReview(
      submission.problem,
      submission.code,
      submission.language,
      submission.status,
    );

    return resp.status(200).json({ result: response });
  } catch (err) {
    console.error("Error in getReview:", err);
    next(err);
  }
};
