// TC-NOTI-05 | Negative | Nhân viên thường (ops_staff) cố thêm kênh
const { req, signStaffToken } = require("../helpers");

test("TC-NOTI-05 | Negative | Nhân viên thường (ops_staff) cố thêm kênh", async () => {
  const staffToken = signStaffToken("ops_staff");
  const { status } = await req("POST", "/notifications/channels", {
    token: staffToken,
    body: { name: "SMS 2", type: "sms" },
  });

  expect(status).toBe(403);
});
