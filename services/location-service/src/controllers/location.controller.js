const repo = require("../repositories/location.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

const reportLocation = asyncHandler(async (req, res) => {
  const record = await repo.reportLocation(req.user.id, req.body);
  return ok(res, record);
});

const getByDriverId = asyncHandler(async (req, res) => {
  const record = await repo.getByDriverId(req.params.id);
  return ok(res, record);
});

const findNearby = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm, driverIds } = req.query;
  const result = await repo.findNearby({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
    driverIds: driverIds ? driverIds.split(",") : undefined,
  });
  return okList(res, result);
});

module.exports = { reportLocation, getByDriverId, findNearby };