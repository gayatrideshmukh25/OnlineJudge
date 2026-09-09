const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const getProfile = async (req, resp) => {
  try {
    const { id } = req.user;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    if (!user) {
      resp.status(404).json({ success: false, message: "User not found" });
      return;
    }
    resp.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    resp.status(500).json({ success: false, message: "Internal server error" });
  }
};
const updateProfile = async (req, resp) => {
  const { id } = req.user;
  const { name, email } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { name, email },
    });
    resp
      .status(200)
      .json({ success: true, user, message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    resp.status(500).json({ success: false, message: "Internal server error" });
  }
};
const changePassword = async (req, resp) => {
  const { id } = req.user;
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    if (!user) {
      resp.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      resp
        .status(400)
        .json({ success: false, message: "Invalid old password" });
      return;
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
    });
    resp
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    resp.status(500).json({ success: false, message: "Internal server error" });
  }
};
const deleteProfile = async (req, resp) => {
  const { id } = req.user;
  try {
    const user = await prisma.user.delete({
      where: { id: parseInt(id) },
    });
    resp
      .status(200)
      .json({ success: true, user, message: "Profile deleted successfully" });
  } catch (error) {
    console.error(error);
    resp.status(500).json({ success: false, message: "Internal server error" });
  }
};
const getUserStats = async (req, resp) => {
  const { id } = req.user;
  try {
    const submissionCount = await prisma.submission.count({
      where: {
        userId: parseInt(id),
      },
    });
    const solvedProblems = await prisma.submission.findMany({
      where: {
        userId: parseInt(id),
        status: "Accepted",
      },
      distinct: ["problemId"],
      select: {
        problemId: true,
      },
    });
    const solvedProblemIds = solvedProblems.map(
      (submission) => submission.problemId,
    );
    const solvedCount = solvedProblems.length;
    resp.status(200).json({
      success: true,
      stats: {
        submissionCount,
        solvedCount,
        acceptanceRate:
          submissionCount > 0
            ? Math.round((solvedCount / submissionCount) * 100)
            : 0,
        solvedProblemIds,
      },
    });
  } catch (error) {
    console.error(error);
    resp.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  deleteProfile,
  changePassword,
  getUserStats,
};
