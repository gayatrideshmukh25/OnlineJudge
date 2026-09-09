const express = require("express");

const isAdmin = (req, resp, next) => {
  const role = String(req.user?.role || "").toLowerCase();

  if (req.user && role === "admin") {
    next();
  } else {
    resp.status(403).json({ success: false, message: "Access denied" });
  }
};
module.exports = isAdmin;
