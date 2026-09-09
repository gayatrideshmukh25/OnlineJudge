const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  deleteProfile,
  changePassword,
  getUserStats,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getProfile);
router.put("/", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);
router.delete("/", authMiddleware, deleteProfile);
router.get("/stats", authMiddleware, getUserStats);

module.exports = router;
