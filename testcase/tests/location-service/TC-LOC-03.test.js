// TC-LOC-03 | Negative | Tra cứu vị trí tài xế chưa từng gửi vị trí
const { req, uuid } = require("../helpers");

test("TC-LOC-03 | Negative | Tra cứu vị trí tài xế chưa từng gửi vị trí", async () => {
  const neverReportedDriverId = uuid();
  const { status, json } = await req("GET", `/locations/drivers/${neverReportedDriverId}`);

  expect(status).toBe(404);
  expect(json.error.code).toBe("LOCATION_NOT_FOUND");
});
