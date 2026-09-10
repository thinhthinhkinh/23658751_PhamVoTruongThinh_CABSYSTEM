// TC-LOC-02 | Negative | Gửi vị trí với dữ liệu sai kiểu
const { req, signDriverToken, uuid } = require("../helpers");

test("TC-LOC-02 | Negative | Gửi vị trí với dữ liệu sai kiểu (lat là chuỗi)", async () => {
  const driverToken = signDriverToken(uuid());
  const { status, json } = await req("POST", "/locations", {
    token: driverToken,
    body: { lat: "không phải số", lng: 106.7 },
  });

  expect(status).toBe(400);
  expect(json.error.code).toBe("INVALID_INPUT");
});
