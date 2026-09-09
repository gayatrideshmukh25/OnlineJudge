const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

exports.loginUser = async (req, resp, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      resp.status(400).json({ message: "Email and password are required" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      resp.status(404).json({ message: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      resp.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    resp.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    resp.status(200).json({
      message: "User logged in successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.registerUser = async (req, resp, next) => {
  try {
    const { username, name, email, password, role } = req.body;
    const finalUsername = username || name;

    if (!finalUsername || !email || !password) {
      resp.status(400).json({ message: "All fields are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      resp.status(409).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedRole = String(role || "USER").toUpperCase();

    await prisma.user.create({
      data: {
        username: finalUsername,
        email,
        password: hashedPassword,
        role: normalizedRole,
      },
    });

    resp.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    next(error);
  }
};
exports.getCurrentUser = async (req, resp, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      resp.status(404).json({ message: "User not found" });
      return;
    }
    resp.status(200).json({ user });
  } catch (error) {
    console.error(error);
    next(error);
  }
};
exports.logoutUser = async (req, resp, next) => {
  try {
    resp.clearCookie("token");
    resp.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.error(error);
    next(error);
  }
};
