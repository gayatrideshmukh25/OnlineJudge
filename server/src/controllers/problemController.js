const prisma = require("../config/prisma");

if (!prisma || typeof prisma !== "object" || !prisma.problem) {
  console.error(
    "Prisma client not initialized or model 'problem' missing",
    prisma,
  );
}

exports.createProblem = async (req, resp, next) => {
  try {
    const { title, description, difficulty } = req.body;
    if (!title || !description || !difficulty) {
      resp
        .status(400)
        .json({ message: "Title, description and difficulty are required" });
      return;
    }

    const normalizedDifficulty = String(difficulty).toUpperCase();
    const slug =
      String(title)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "problem";

    const problem = await prisma.problem.create({
      data: {
        title,
        slug,
        description,
        difficulty: normalizedDifficulty,
      },
    });

    resp.status(201).json({
      success: true,
      problem,
      message: "Problem created successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllProblems = async (req, resp, next) => {
  try {
    const problems = await prisma.problem.findMany();
    resp.status(200).json({ success: true, problems });
  } catch (error) {
    next(error);
  }
};

exports.getProblemById = async (req, resp, next) => {
  try {
    const { id } = req.params;
    const problem = await prisma.problem.findUnique({
      where: { id: parseInt(id) },
    });
    const testCases = await prisma.testCase.findMany({
      where: { problemId: parseInt(id) },
    });
    if (!problem) {
      resp.status(404).json({ success: false, message: "Problem not found" });
      return;
    }
    resp.status(200).json({ success: true, problem, testCases });
  } catch (error) {
    next(error);
  }
};

exports.updateProblem = async (req, resp, next) => {
  const { id } = req.params;
  const { title, description, difficulty } = req.body;

  try {
    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (difficulty) updateData.difficulty = String(difficulty).toUpperCase();

    if (title) {
      updateData.slug =
        String(title)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "problem";
    }

    const problem = await prisma.problem.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    resp.status(200).json({
      success: true,
      problem,
      message: "Problem updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
exports.deleteProblem = async (req, resp, next) => {
  const { id } = req.params;
  try {
    const problem = await prisma.problem.delete({
      where: { id: parseInt(id) },
    });
    resp.status(200).json({
      success: true,
      problem,
      message: "Problem deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
