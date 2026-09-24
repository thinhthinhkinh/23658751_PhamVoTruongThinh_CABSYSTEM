// TC-NOTI-04 | Positive | Ops_admin thêm kênh thông báo mới
const { req, signStaffToken } = require("../helpers");

test("TC-NOTI-04 | Positive | Ops_admin thêm kênh thông báo mới", async () => {
  const adminToken = signStaffToken("ops_admin");
  const { status, json } = await req("POST", "/notifications/channels", {
    token: adminToken,
    body: { name: "Zalo OA", type: "zalo" },
  });

  expect(status).toBe(201);
  expect(json.data.type).toBe("zalo");
});
