const express = require("express");
const router = express.Router();

const middleware = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");
const {
  getAllSubmissions,
  submissionById,
  createSubmission,
  submissionByUserId,
  deleteSubmissionByProblemId,
} = require("../controllers/submissionController");
console.log("SUBMISSION ROUTE REGISTERED");
router.get("/", middleware, getAllSubmissions);
router.get("/user", middleware, submissionByUserId);
router.get("/:id", middleware, submissionById);
router.post("/", middleware, createSubmission);
router.delete("/:id", middleware, deleteSubmissionByProblemId);

module.exports = router;
