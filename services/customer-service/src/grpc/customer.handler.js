const repo = require("../repositories/customer.repository");
const { toPublicJSON } = require("../models/customer.model");
const { signToken } = require("../utils/jwt.util");

function ok(data, status = 200) {
  return { success: true, json: JSON.stringify(data), http_status: status };
}
function fail(err) {
  return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.statusCode || 500 };
}

module.exports = {
  async Register(call, cb) {
    try {
      const customer = await repo.register(call.request);
      const token = signToken({ id: customer.id, role: "customer" });
      cb(null, ok({ token, customer: toPublicJSON(customer) }, 201));
    } catch (e) { cb(null, fail(e)); }
  },

  async Login(call, cb) {
    try {
      const customer = await repo.login(call.request);
      const token = signToken({ id: customer.id, role: "customer" });
      cb(null, ok({ token, customer: toPublicJSON(customer) }));
    } catch (e) { cb(null, fail(e)); }
  },

  async GetProfile(call, cb) {
    try {
      const c = await repo.getById(call.request.userId);
      cb(null, ok(toPublicJSON(c)));
    } catch (e) { cb(null, fail(e)); }
  },

  async UpdateProfile(call, cb) {
    try {
      const { userId, fullName, phone } = call.request;
      const c = await repo.updateProfile(userId, { fullName, phone });
      cb(null, ok(toPublicJSON(c)));
    } catch (e) { cb(null, fail(e)); }
  },

  async ListAll(call, cb) {
    try {
      const list = await repo.listAll();
      cb(null, ok({ data: list.map(toPublicJSON) }));
    } catch (e) { cb(null, fail(e)); }
  },

  async GetById(call, cb) {
    try {
      const c = await repo.getById(call.request.id);
      cb(null, ok(toPublicJSON(c)));
    } catch (e) { cb(null, fail(e)); }
  },

  async Disable(call, cb) {
    try {
      const c = await repo.disable(call.request.id);
      cb(null, ok(toPublicJSON(c)));
    } catch (e) { cb(null, fail(e)); }
  },

  // Unused — GetMyTrips and GetMyPayments are routed to trip/payment service
  async GetMyTrips(call, cb) { cb(null, ok([])); },
  async GetMyPayments(call, cb) { cb(null, ok([])); },
};
