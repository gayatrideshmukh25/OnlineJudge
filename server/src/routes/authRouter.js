const express = require("express");
const router = express.Router();
const {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/me", authMiddleware, getCurrentUser);
router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/logout", authMiddleware, logoutUser);

module.exports = router;
