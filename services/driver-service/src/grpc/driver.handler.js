const repo = require("../repositories/driver.repository");
const { toPublicJSON } = require("../models/driver.model");
const { signToken } = require("../utils/jwt.util");
const authClient = require("../utils/grpcAuthClient");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.status || err.statusCode || 500 }; }

module.exports = {
  async RegisterSelf(call, cb) {
    try {
      const { fullName, email, password, phone, vehiclePlate, vehicleModel, vehicleType } = call.request;
      const vehicle = (vehiclePlate || vehicleModel || vehicleType) ? { plate: vehiclePlate, model: vehicleModel, type: vehicleType } : null;
      const driver = await repo.register({ fullName, email, password, phone, vehicle }, false);
      await authClient.registerCredentials({
        userId: driver.id, email: driver.email,
        password, role: "driver",
      });
      const token = signToken({ id: driver.id, role: "driver" });
      cb(null, ok({ data: { token, driver: toPublicJSON(driver) } }, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async Login(call, cb) {
    try {
      const authResp = await authClient.loginByEmail({
        email: call.request.email, password: call.request.password, role: "driver",
      });
      if (!authResp.success) {
        const err = new Error(authResp.error_message || "Email hoặc mật khẩu không đúng");
        err.code = authResp.error_code || "INVALID_CREDENTIALS";
        err.status = authResp.http_status || 401;
        throw err;
      }
      const { token, userId } = JSON.parse(authResp.json).data;
      const driver = await repo.getById(userId);
      if (driver.active === false) {
        const err = new Error("Tài khoản đã bị khóa");
        err.code = "ACCOUNT_DISABLED"; err.status = 403;
        throw err;
      }
      cb(null, ok({ data: { token, driver: toPublicJSON(driver) } }));
    } catch (e) { cb(null, fail(e)); }
  },
  async CreateByStaff(call, cb) {
    try {
      const { fullName, email, password, phone, vehiclePlate, vehicleModel, vehicleType } = call.request;
      const vehicle = (vehiclePlate || vehicleModel || vehicleType) ? { plate: vehiclePlate, model: vehicleModel, type: vehicleType } : null;
      const driver = await repo.register({ fullName, email, password, phone, vehicle }, true);
      cb(null, ok({ data: toPublicJSON(driver) }, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetMyProfile(call, cb) {
    try { cb(null, ok(toPublicJSON(await repo.getById(call.request.userId)))); }
    catch (e) { cb(null, fail(e)); }
  },
  async UpdateProfile(call, cb) {
    try {
      const { userId, fullName, phone } = call.request;
      cb(null, ok(toPublicJSON(await repo.updateProfile(userId, { fullName, phone }))));
    } catch (e) { cb(null, fail(e)); }
  },
  async UpdateVehicle(call, cb) {
    try {
      const { userId, vehiclePlate, vehicleModel, vehicleType } = call.request;
      cb(null, ok(toPublicJSON(await repo.updateVehicle(userId, { plate: vehiclePlate, model: vehicleModel, type: vehicleType }))));
    } catch (e) { cb(null, fail(e)); }
  },
  async UpdateStatus(call, cb) {
    try {
      cb(null, ok({ data: toPublicJSON(await repo.updateStatus(call.request.userId, call.request.status)) }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListByStatus(call, cb) {
    try {
      const drivers = call.request.status === "available" ? await repo.listAvailable() : [];
      cb(null, ok({ data: drivers.map(toPublicJSON) }));
    } catch (e) { cb(null, fail(e)); }
  },
  async ListAll(call, cb) {
    try {
      const drivers = await repo.listAll();
      cb(null, ok({ data: drivers.map(toPublicJSON) }));
    } catch (e) { cb(null, fail(e)); }
  },
  async GetById(call, cb) {
    try {
      const includeHash = ["ops_staff", "ops_admin"].includes(call.request.callerRole);
      cb(null, ok(toPublicJSON(await repo.getById(call.request.id), { includeHash })));
    }
    catch (e) { cb(null, fail(e)); }
  },
  async Disable(call, cb) {
    try { cb(null, ok({ data: toPublicJSON(await repo.disable(call.request.id)) })); }
    catch (e) { cb(null, fail(e)); }
  },
  async ApproveDriver(call, cb) {
    try { cb(null, ok(toPublicJSON(await repo.setApprovalStatus(call.request.id, "approved")))); }
    catch (e) { cb(null, fail(e)); }
  },
  async RejectDriver(call, cb) {
    try { cb(null, ok(toPublicJSON(await repo.setApprovalStatus(call.request.id, "rejected")))); }
    catch (e) { cb(null, fail(e)); }
  },
  // Delegated to trip-service by gateway
  async GetDriverTrips(call, cb) { cb(null, ok({ data: [] })); },
  async GetDriverRatings(call, cb) { cb(null, ok({ data: [] })); },
};
