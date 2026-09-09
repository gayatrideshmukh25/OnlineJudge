const express = require("express");
const router = express.Router();
const {
  saveUserCode,
  getUserCode,
} = require("../controllers/userCodeController.js");
const authMiddleware = require("../middleware/authMiddleware.js");
router.put("/:problemId/:language", authMiddleware, saveUserCode);
router.get("/:problemId/:language", authMiddleware, getUserCode);

module.exports = router;
