const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function signToken(payload, options = {}) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d", ...options });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
