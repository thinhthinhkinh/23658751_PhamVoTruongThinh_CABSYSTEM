require("dotenv").config();
const app = require("./app");

const PORT = process.env.EVENT_BUS_PORT || 4000;

app.listen(PORT, () => {
  console.log(`[event-bus-service] đang chạy tại http://localhost:${PORT}`);
});
