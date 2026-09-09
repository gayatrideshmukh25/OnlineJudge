const jwt = require("jsonwebtoken");

const authMiddleware = (req, resp, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;
    }

    if (!token) {
      console.log("No token found in request");
      resp
        .status(401)
        .json({ success: false, message: "Unauthorized User Please Login" });
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    req.user = decoded;
    next();
  } catch (error) {
    resp
      .status(401)
      .json({ success: false, message: "Unauthorized User Please Login" });
  }
};

module.exports = authMiddleware;
