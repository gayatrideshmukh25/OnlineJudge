const express = require("express");
const router = express.Router();
const {
  getAllProblems,
  getProblemById,
  createProblem,
  updateProblem,
  deleteProblem,
} = require("../controllers/problemController");
const authMiddleware = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

router.get("/", getAllProblems);
router.get("/:id", getProblemById);
router.post("/", authMiddleware, isAdmin, createProblem);
router.put("/:id", authMiddleware, isAdmin, updateProblem);
router.delete("/:id", authMiddleware, isAdmin, deleteProblem);

module.exports = router;
