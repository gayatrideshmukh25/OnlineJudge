const express = require("express");
const router = express.Router();
const { runCode } = require("../controllers/codeExecutionController");
const middleware = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

router.post("/run", middleware, runCode);

module.exports = router;
