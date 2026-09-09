const prisma = require("../config/prisma");
const createSubmission = async (req, resp, next) => {
  const userId = req.user?.id;
  const { code, language, problemId } = req.body;
  try {
    if (!code || !language || !problemId || !userId) {
      resp
        .status(400)
        .json({ message: "Code, language, problemId and userId are required" });
      return;
    }
    const problem = await prisma.problem.findUnique({
      where: {
        id: parseInt(problemId),
      },
    });

    if (!problem) {
      return resp.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }
    const submission = await prisma.submission.create({
      data: {
        code,
        language,
        problemId: parseInt(problemId),
        userId: parseInt(userId),
        status: "pending",
      },
    });
    resp.status(201).json({
      success: true,
      submission,
      message: "Submission created successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getAllSubmissions = async (req, resp, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      resp.status(400).json({ message: "User ID is required" });
      return;
    }

    if (!prisma || !prisma.submission) {
      console.error(
        "Prisma client missing `submission` model",
        prisma && Object.keys(prisma),
      );
      return next(new Error("Prisma client missing `submission` model"));
    }

    const submissions = await prisma.submission.findMany({
      where: {
        userId: parseInt(userId),
      },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    resp.status(200).json({ success: true, submissions });
  } catch (error) {
    next(error);
  }
};

const submissionById = async (req, resp, next) => {
  const { id } = req.params;
  try {
    if (!id) {
      resp.status(400).json({ message: "Submission ID is required" });
      return;
    }
    const submission = await prisma.submission.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        problem: true,
        user: true,
      },
    });
    if (!submission) {
      resp
        .status(404)
        .json({ success: false, message: "Submission not found" });
      return;
    }
    resp.status(200).json({ success: true, submission });
  } catch (error) {
    next(error);
  }
};
const submissionByUserId = async (req, resp, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      resp.status(400).json({ message: "User ID is required" });
      return;
    }
    const submissions = await prisma.submission.findMany({
      where: { userId: parseInt(userId) },
      include: { problem: true },
    });
    resp.status(200).json({ success: true, submissions });
  } catch (error) {
    next(error);
  }
};
const deleteSubmissionByProblemId = async (req, resp) => {
  const { id } = req.params;
  try {
    if (!id) {
      resp.status(400).json({ message: "Problem ID is required" });
      return;
    }
    const deletedSubmissions = await prisma.submission.deleteMany({
      where: { problemId: parseInt(id) },
    });
    resp.status(200).json({ success: true, deletedSubmissions });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  createSubmission,
  getAllSubmissions,
  submissionById,
  submissionByUserId,
  deleteSubmissionByProblemId,
};
