const repo = require("../repositories/driver.repository");
const { toPublicJSON } = require("../models/driver.model");
const { signToken } = require("../utils/jwt.util");

function ok(data, status = 200) { return { success: true, json: JSON.stringify(data), http_status: status }; }
function fail(err) { return { success: false, error_code: err.code || "INTERNAL", error_message: err.message, http_status: err.statusCode || 500 }; }

module.exports = {
  async RegisterSelf(call, cb) {
    try {
      const { fullName, email, password, phone, vehiclePlate, vehicleModel, vehicleType } = call.request;
      const driver = await repo.register({ fullName, email, password, phone, vehicle: { plate: vehiclePlate, model: vehicleModel, type: vehicleType } }, false);
      const token = signToken({ id: driver.id, role: "driver" });
      cb(null, ok({ token, driver: toPublicJSON(driver) }, 201));
    } catch (e) { cb(null, fail(e)); }
  },
  async Login(call, cb) {
    try {
      const driver = await repo.login(call.request);
      const token = signToken({ id: driver.id, role: "driver" });
      cb(null, ok({ token, driver: toPublicJSON(driver) }));
    } catch (e) { cb(null, fail(e)); }
  },
  async CreateByStaff(call, cb) {
    try {
      const { fullName, email, password, phone, vehiclePlate, vehicleModel, vehicleType } = call.request;
      const driver = await repo.register({ fullName, email, password, phone, vehicle: { plate: vehiclePlate, model: vehicleModel, type: vehicleType } }, true);
      cb(null, ok(toPublicJSON(driver), 201));
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
      cb(null, ok(toPublicJSON(await repo.updateStatus(call.request.userId, call.request.status))));
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
    try { cb(null, ok(toPublicJSON(await repo.getById(call.request.id)))); }
    catch (e) { cb(null, fail(e)); }
  },
  async Disable(call, cb) {
    try { cb(null, ok(toPublicJSON(await repo.disable(call.request.id)))); }
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
