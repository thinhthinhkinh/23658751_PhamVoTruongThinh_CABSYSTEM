// Middleware xử lý lỗi tập trung — luôn đặt sau cùng trong app.js.
function errorMiddleware(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || "Đã có lỗi xảy ra, vui lòng thử lại sau";
  res.status(status).json({ error: { code, message } });
}

module.exports = errorMiddleware;
