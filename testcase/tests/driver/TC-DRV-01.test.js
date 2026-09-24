// TC-DRV-01 | Positive | Tài xế tự đăng ký kèm phương tiện
const { req, randEmail } = require("../helpers");

test("TC-DRV-01 | Positive | Tài xế tự đăng ký kèm phương tiện", async () => {
  const email = randEmail();
  const { status, json } = await req("POST", "/drivers/register", {
    body: {
      fullName: "Trần Văn B",
      email,
      password: "123456",
      vehicle: { plate: "51H-123.45", model: "Vios", type: "4-seat" },
    },
  });

  expect(status).toBe(201);
  expect(json.data.token).toBeDefined();
  expect(json.data.driver.status).toBe("offline");
  expect(json.data.driver.vehicle.plate).toBe("51H-123.45");
  expect(json.data.driver.passwordHash).toBeUndefined();
});
