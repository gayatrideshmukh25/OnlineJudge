const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();
const app = express();
// cors to allow requests from the frontend
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// parse incoming JSON requests
app.use(express.json());
app.use(cookieParser());
// Simple request logger
app.use((req, res, next) => {
  next();
});

// Routes
app.use("/api/auth", require("./routes/authRouter"));
app.use("/api/users", require("./routes/userRouter"));
app.use("/api/problems", require("./routes/problemRouter"));
app.use("/api/testcases", require("./routes/testCaseRouter"));
app.use("/api/submissions", require("./routes/submissionRouter"));
app.use("/api/judge", require("./routes/judgeRouter"));
app.use("/api/code", require("./routes/codeExecutionRouter"));
app.use("/api/usercode", require("./routes/userCodeRouter"));
app.use((req, res, next) => {
  next();
});
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handling middleware
const errorMiddleware = require("./middleware/errorMiddleware");
app.use(errorMiddleware);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
