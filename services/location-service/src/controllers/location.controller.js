const repo = require("../repositories/location.repository");
const { ok, okList } = require("../utils/response.util");
const asyncHandler = require("../utils/asyncHandler");

// POST /locations — tài xế gửi vị trí hiện tại (FR-10)
const reportLocation = asyncHandler(async (req, res) => {
  const record = repo.reportLocation(req.user.id, req.body);
  return ok(res, record);
});

// GET /locations/drivers/:id — FR-10
const getByDriverId = asyncHandler(async (req, res) => {
  const record = repo.getByDriverId(req.params.id);
  return ok(res, record);
});

// GET /locations/nearby-drivers?lat=&lng=&radiusKm=&driverIds= — FR-06 (Dispatch Service gọi)
const findNearby = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm, driverIds } = req.query;
  const result = repo.findNearby({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
    driverIds: driverIds ? driverIds.split(",") : undefined,
  });
  return okList(res, result);
});

module.exports = { reportLocation, getByDriverId, findNearby };
