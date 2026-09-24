const { verifyToken } = require("../utils/jwt.util");

// Kiểm tra Bearer token, gắn req.user = { id, role, ... } nếu hợp lệ.
function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Thiếu hoặc sai định dạng Authorization header" },
    });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    return res.status(401).json({
      error: { code: "INVALID_TOKEN", message: "Token không hợp lệ hoặc đã hết hạn" },
    });
  }
}

module.exports = { authRequired };
