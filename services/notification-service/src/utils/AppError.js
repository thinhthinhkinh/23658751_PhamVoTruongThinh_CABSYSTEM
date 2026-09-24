// Lỗi nghiệp vụ có status/code rõ ràng, để errorMiddleware trả response chuẩn.
class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

module.exports = AppError;
