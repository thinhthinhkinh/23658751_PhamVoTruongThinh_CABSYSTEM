const { v4: uuidv4 } = require("uuid");
const resolvedIssueDao = require("../daos/resolvedIssue.dao");
const AppError = require("../utils/AppError");
const { grpcCall, customerClient, driverClient, bookingClient, tripClient, paymentClient } = require("../utils/grpcClient");

async function listCustomers(callerId, callerRole) {
  const body = await grpcCall(customerClient, "ListAll", { callerId, callerRole });
  return body.data || [];
}

async function listDrivers(callerId, callerRole) {
  const body = await grpcCall(driverClient, "ListAll", { callerId, callerRole });
  return body.data || [];
}

async function listVehicles(callerId, callerRole) {
  const drivers = await listDrivers(callerId, callerRole);
  return drivers.filter((d) => d.vehicle).map((d) => ({ driverId: d.id, driverName: d.fullName, ...d.vehicle }));
}

async function disableCustomer(callerId, callerRole, id) {
  const body = await grpcCall(customerClient, "Disable", { id, callerId, callerRole });
  return body.data || body;
}

async function listBookings(callerId, callerRole, status) {
  const body = await grpcCall(bookingClient, "ListAll", { callerId, callerRole });
  const bookings = body.data || [];
  return status ? bookings.filter((b) => b.status === status) : bookings;
}

async function getDriverStatus(driverId) {
  const body = await grpcCall(driverClient, "GetById", { id: driverId, callerId: "", callerRole: "admin" });
  return body.data || body;
}

async function listTransactions(callerId, callerRole) {
  const body = await grpcCall(paymentClient, "ListAll", { callerId, callerRole });
  return body.data || [];
}

async function resolveBookingIssue(bookingId, resolutionNote, resolvedBy) {
  return resolvedIssueDao.insert({ _id: uuidv4(), bookingId, resolutionNote, resolvedBy });
}

function inRange(dateStr, from, to) {
  const d = new Date(dateStr).getTime();
  if (from && d < new Date(from).getTime()) return false;
  if (to && d > new Date(to).getTime()) return false;
  return true;
}

async function getBookingsInRange(callerId, callerRole, from, to) {
  const bookings = await listBookings(callerId, callerRole);
  return bookings.filter((b) => inRange(b.createdAt, from, to));
}

async function reportBookingCount(callerId, callerRole, from, to) {
  const bookings = await getBookingsInRange(callerId, callerRole, from, to);
  return { from: from || null, to: to || null, value: bookings.length };
}

async function reportRevenue(callerId, callerRole, from, to) {
  const txs = await listTransactions(callerId, callerRole);
  const value = txs
    .filter((t) => t.status === "success" && inRange(t.createdAt, from, to))
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  return { from: from || null, to: to || null, value };
}

async function reportCompletionRate(callerId, callerRole, from, to) {
  const bookings = await getBookingsInRange(callerId, callerRole, from, to);
  // After split: booking terminal statuses are driver_assigned (completed trip), no_driver_found, cancelled
  const assigned = bookings.filter((b) => b.status === "driver_assigned").length;
  const value = bookings.length ? assigned / bookings.length : 0;
  return { from: from || null, to: to || null, value };
}

async function reportCancellationRate(callerId, callerRole, from, to) {
  const bookings = await getBookingsInRange(callerId, callerRole, from, to);
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const value = bookings.length ? cancelled / bookings.length : 0;
  return { from: from || null, to: to || null, value };
}

async function reportDriverPerformance(callerId, callerRole, from, to) {
  const bookings = await getBookingsInRange(callerId, callerRole, from, to);
  const byDriver = new Map();

  for (const b of bookings) {
    if (!b.driverId) continue;
    if (!byDriver.has(b.driverId)) byDriver.set(b.driverId, { total: 0, completed: 0 });
    byDriver.get(b.driverId).total += 1;
  }

  const results = [];
  for (const [driverId, stat] of byDriver.entries()) {
    // Count completed trips for this driver from trip-service
    try {
      const tripsBody = await grpcCall(tripClient, "GetDriverTrips", { userId: driverId, callerRole: "admin", limit: 10000, page: 1 });
      const trips = tripsBody.data || [];
      for (const t of trips) {
        if (t.status === "completed" && inRange(t.completedAt || t.createdAt, from, to)) {
          stat.completed += 1;
        }
      }
    } catch { /* fall back to 0 */ }

    let averageRating = null;
    try {
      const body = await grpcCall(tripClient, "GetDriverRatings", { userId: driverId, callerRole: "admin" });
      averageRating = body?.data?.averageScore ?? body?.averageScore ?? null;
    } catch {
      averageRating = null;
    }
    results.push({
      driverId,
      totalBookings: stat.total,
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
  listBookings,
  getDriverStatus,
  listTransactions,
  resolveBookingIssue,
  reportBookingCount,
  reportRevenue,
  reportCompletionRate,
  reportCancellationRate,
  reportDriverPerformance,
};
