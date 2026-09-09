const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

const {
  createTestCase,
  getTestCases,
  getTestCaseById,
  updateTestCase,
  deleteTestCase,
} = require("../controllers/testCaseController");

// Admin Only

router.post("/:problemId", authMiddleware, isAdmin, createTestCase);

router.get("/:problemId", authMiddleware, isAdmin, getTestCases);

router.put("/:id", authMiddleware, isAdmin, updateTestCase);

router.delete("/:id", authMiddleware, isAdmin, deleteTestCase);

module.exports = router;
