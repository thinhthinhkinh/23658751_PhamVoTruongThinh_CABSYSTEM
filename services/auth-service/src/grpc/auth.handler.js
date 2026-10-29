const repo = require("../repositories/auth.repository");

function ok(data, status = 200) {
  return { success: true, json: JSON.stringify(data), http_status: status };
}
function fail(err) {
  return {
    success: false,
    error_code: err.code || "INTERNAL",
    error_message: err.message,
    http_status: err.status || err.statusCode || 500,
  };
}

module.exports = {
  async RegisterCredentials(call, cb) {
    try {
      const result = await repo.registerCredentials(call.request);
      cb(null, ok({ data: result }, 201));
    } catch (e) { cb(null, fail(e)); }
  },

  async LoginByEmail(call, cb) {
    try {
      const result = await repo.loginByEmail(call.request);
      cb(null, ok({ data: result }));
    } catch (e) { cb(null, fail(e)); }
  },

  async ValidateToken(call, cb) {
    try {
      const result = await repo.validateToken(call.request.token);
      cb(null, result);
    } catch (e) {
      cb(null, { valid: false, userId: "", role: "" });
    }
  },

  async RevokeToken(call, cb) {
    try {
      await repo.revokeToken(call.request.token);
      cb(null, ok({ data: { revoked: true } }));
    } catch (e) { cb(null, fail(e)); }
  },
};
