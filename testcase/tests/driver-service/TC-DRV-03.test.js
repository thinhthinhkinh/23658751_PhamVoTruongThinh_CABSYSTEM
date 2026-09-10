// TC-DRV-03 | Positive | Nhân viên vận hành tạo tài khoản tài xế
const { req, randEmail, signStaffToken } = require("../helpers");

test("TC-DRV-03 | Positive | Nhân viên vận hành tạo tài khoản tài xế", async () => {
  const staffToken = signStaffToken("ops_staff");
  const { status, json } = await req("POST", "/drivers", {
    token: staffToken,
    body: { fullName: "Tài xế do NV tạo", email: randEmail(), password: "123456" },
  });

  expect(status).toBe(201);
  expect(json.data.createdByStaff).toBe(true);
});
