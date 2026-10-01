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
  const { lat, lng, radiusKm, driverIds, limit, page } = req.query;
  const result = await repo.findNearby({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
    driverIds: driverIds ? driverIds.split(",") : undefined,
  });

  const total = result.length;
  if (limit && page) {
    const limitNum = Math.max(1, parseInt(limit, 10));
    const pageNum = Math.max(1, parseInt(page, 10));
    const start = (pageNum - 1) * limitNum;
    const paginated = result.slice(start, start + limitNum);
    return okList(res, paginated, { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  }
  return okList(res, result, { total });
});

module.exports = { reportLocation, getByDriverId, findNearby };