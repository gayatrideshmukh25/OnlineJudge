const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  judgeSubmission,
  getJudgeResult,
} = require("../controllers/judgeController");

router.post("/:submissionId", authMiddleware, judgeSubmission);

router.get("/:submissionId", authMiddleware, getJudgeResult);

module.exports = router;
