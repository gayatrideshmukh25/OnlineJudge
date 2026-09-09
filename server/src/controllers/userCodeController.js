const prisma = require("../config/prisma");
const saveUserCode = async (req, resp, next) => {
  const { problemId, language } = req.params;
  const { code } = req.body;
  const userId =
    req.user?.id || req.user?._id || req.user?.user?.id || req.user?.user?._id;
  try {
    if (!code) {
      throw new Error("Code is required");
    }
    const userCode = await prisma.userCode.upsert({
      where: {
        userId_problemId_language: {
          userId: Number(userId),
          problemId: Number(problemId),
          language,
        },
      },
      update: { code },
      create: {
        problemId: Number(problemId),
        language,
        code,
        userId: Number(userId),
      },
    });
    console.log("saved code : ", userCode, problemId, language, code, userId);
    resp.status(201).json({ success: true, userCode });
  } catch (error) {
    console.error("Error saving user code:", error);
    next(error);
  }
};
const getUserCode = async (req, resp, next) => {
  const { problemId, language } = req.params;
  console.log(
    "getting user code for problemId:",
    problemId,
    "language:",
    language,
  );
  const userId =
    req.user?.id || req.user?._id || req.user?.user?.id || req.user?.user?._id;
  try {
    const userCode = await prisma.userCode.findUnique({
      where: {
        userId_problemId_language: {
          userId: Number(userId),
          problemId: Number(problemId),
          language,
        },
      },
    });
    console.log(userCode);
    resp.status(200).json({ success: true, userCode });
  } catch (error) {
    next(error);
  }
};

module.exports = { saveUserCode, getUserCode };
