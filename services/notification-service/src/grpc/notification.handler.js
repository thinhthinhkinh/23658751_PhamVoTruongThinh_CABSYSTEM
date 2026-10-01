const repo = require("../repositories/notification.repository");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.statusCode || 500 }; }

module.exports = {
  // UserIdRequest { userId, callerRole }
  async GetMyNotifications(call, cb) {
    try {
      const notifications = await repo.getMyNotifications(call.request.userId);
      cb(null, ok({ data: notifications }));
    } catch (e) { cb(null, fail(e)); }
  },
  async AddChannel(call, cb) {
    try {
      const channel = await repo.addChannel({ name: call.request.name, type: call.request.type });
      cb(null, ok(channel, 201));
    } catch (e) { cb(null, fail(e)); }
  },
};
