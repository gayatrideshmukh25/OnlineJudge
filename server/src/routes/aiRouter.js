const express = require("express");
const router = express.Router();
const { getReview } = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");

console.log;
router.post("/getReview", authMiddleware, getReview);
module.exports = router;
