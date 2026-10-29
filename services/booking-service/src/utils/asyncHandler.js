// Bọc controller async để tự động forward lỗi cho errorMiddleware, tránh lặp try/catch.
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
