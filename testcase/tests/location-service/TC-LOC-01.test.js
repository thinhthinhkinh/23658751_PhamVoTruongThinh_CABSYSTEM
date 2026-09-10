// TC-LOC-01 | Positive | Tài xế gửi vị trí hợp lệ
const { req, signDriverToken, uuid } = require("../helpers");

test("TC-LOC-01 | Positive | Tài xế gửi vị trí hợp lệ", async () => {
  const driverToken = signDriverToken(uuid());
  const { status, json } = await req("POST", "/locations", {
    token: driverToken,
    body: { lat: 10.7769, lng: 106.7009 },
  });

  expect(status).toBe(200);
  expect(json.data.lat).toBe(10.7769);
  expect(json.data.lng).toBe(106.7009);
});
