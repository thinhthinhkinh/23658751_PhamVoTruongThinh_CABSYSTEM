const { v4: uuidv4 } = require("uuid");
const resolvedIssueDao = require("../daos/resolvedIssue.dao");
const { createResolvedIssue } = require("../models/resolvedIssue.model");
const AppError = require("../utils/AppError");

const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || "http://localhost:4001";
const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || "http://localhost:4002";
const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || "http://localhost:4003";
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:4007";

// Admin Service không sở hữu dữ liệu — mọi thao tác đọc/ghi nhạy cảm đều gọi sang
// service sở hữu dữ liệu đó, kèm nguyên Authorization header của nhân viên vận hành
// (JWT ops_staff/ops_admin hợp lệ ở mọi service vì dùng chung JWT_SECRET).
async function callService(url, { method = "GET", authHeader, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AppError(res.status, json?.error?.code || "UPSTREAM_ERROR", json?.error?.message || "Lỗi khi gọi service khác");
  }
  return json.data;
}

// ---- FR-20: quản lý khách hàng / tài xế / phương tiện ----
function listCustomers(authHeader) {
  return callService(`${CUSTOMER_SERVICE_URL}/customers/all`, { authHeader });
}

function listDrivers(authHeader) {
  return callService(`${DRIVER_SERVICE_URL}/drivers/all`, { authHeader });
}

async function listVehicles(authHeader) {
  const drivers = await listDrivers(authHeader);
  return drivers.filter((d) => d.vehicle).map((d) => ({ driverId: d.id, driverName: d.fullName, ...d.vehicle }));
}

// FR-22: thao tác nhạy cảm — chỉ ops_admin (đã enforce ở route), Customer Service enforce lại lần nữa
function disableCustomer(authHeader, id) {
  return callService(`${CUSTOMER_SERVICE_URL}/customers/${id}/disable`, { method: "PATCH", authHeader });
}

// ---- FR-21: giám sát vận hành ----
function listTrips(authHeader, status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return callService(`${TRIP_SERVICE_URL}/trips${qs}`, { authHeader });
}

function getDriverStatus(driverId) {
  return callService(`${DRIVER_SERVICE_URL}/drivers/${driverId}`);
}

function listTransactions(authHeader) {
  return callService(`${PAYMENT_SERVICE_URL}/payments`, { authHeader });
}

function resolveTripIssue(tripId, resolutionNote, resolvedBy) {
  const record = createResolvedIssue({ id: uuidv4(), tripId, resolutionNote, resolvedBy });
  return resolvedIssueDao.insert(record);
}

// ---- FR-23: báo cáo ----
function inRange(dateStr, from, to) {
  const d = new Date(dateStr).getTime();
  if (from && d < new Date(from).getTime()) return false;
  if (to && d > new Date(to).getTime()) return false;
  return true;
}

async function getTripsInRange(authHeader, from, to) {
  const trips = await listTrips(authHeader);
  return trips.filter((t) => inRange(t.createdAt, from, to));
}

async function reportTripCount(authHeader, from, to) {
  const trips = await getTripsInRange(authHeader, from, to);
  return { from: from || null, to: to || null, value: trips.length };
}

async function reportRevenue(authHeader, from, to) {
  const trips = await getTripsInRange(authHeader, from, to);
  const value = trips.filter((t) => t.status === "completed").reduce((sum, t) => sum + (t.fareAmount || 0), 0);
  return { from: from || null, to: to || null, value };
}

async function reportCompletionRate(authHeader, from, to) {
  const trips = await getTripsInRange(authHeader, from, to);
  const completed = trips.filter((t) => t.status === "completed").length;
  const value = trips.length ? completed / trips.length : 0;
  return { from: from || null, to: to || null, value };
}

async function reportCancellationRate(authHeader, from, to) {
  const trips = await getTripsInRange(authHeader, from, to);
  const cancelled = trips.filter((t) => t.status === "cancelled").length;
  const value = trips.length ? cancelled / trips.length : 0;
  return { from: from || null, to: to || null, value };
}

async function reportDriverPerformance(authHeader, from, to) {
  const trips = await getTripsInRange(authHeader, from, to);
  const byDriver = new Map();

  for (const t of trips) {
    if (!t.driverId) continue;
    if (!byDriver.has(t.driverId)) byDriver.set(t.driverId, { total: 0, completed: 0 });
    const stat = byDriver.get(t.driverId);
    stat.total += 1;
    if (t.status === "completed") stat.completed += 1;
  }

  const results = [];
  for (const [driverId, stat] of byDriver.entries()) {
    let averageRating = null;
    try {
      const ratingInfo = await callService(`${TRIP_SERVICE_URL}/drivers/${driverId}/ratings`);
      averageRating = ratingInfo.averageScore;
    } catch {
      averageRating = null;
    }
    results.push({
      driverId,
      totalTrips: stat.total,
      completionRate: stat.total ? stat.completed / stat.total : 0,
      averageRating,
    });
  }
  return results;
}

module.exports = {
  listCustomers,
  listDrivers,
  listVehicles,
  disableCustomer,
  listTrips,
  getDriverStatus,
  listTransactions,
  resolveTripIssue,
  reportTripCount,
  reportRevenue,
  reportCompletionRate,
  reportCancellationRate,
  reportDriverPerformance,
};
