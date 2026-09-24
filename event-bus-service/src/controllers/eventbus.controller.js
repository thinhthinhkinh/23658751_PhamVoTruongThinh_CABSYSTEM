const store = require("../store");

// POST /subscribe { event, webhookUrl }
// Một service tự đăng ký lắng nghe 1 loại event, kèm địa chỉ webhook nội bộ để nhận payload.
function subscribeHandler(req, res) {
  const { event, webhookUrl } = req.body;
  if (!event || !webhookUrl) {
    return res.status(400).json({
      error: { code: "INVALID_INPUT", message: "Cần cung cấp 'event' và 'webhookUrl'" },
    });
  }
  store.subscribe(event, webhookUrl);
  console.log(`[event-bus] ${webhookUrl} đã subscribe event "${event}"`);
  return res.status(201).json({ data: { event, webhookUrl } });
}

// POST /publish { event, payload }
// Forward payload tới tất cả webhook đã subscribe event này. Không chờ subscriber
// xử lý xong (fire-and-forget) để publisher không bị block bởi subscriber chậm/lỗi
// -> đây chính là cơ chế cách ly lỗi giữa các service.
async function publishHandler(req, res) {
  const { event, payload } = req.body;
  if (!event) {
    return res.status(400).json({
      error: { code: "INVALID_INPUT", message: "Cần cung cấp 'event'" },
    });
  }

  const subscribers = store.getSubscribers(event);
  console.log(`[event-bus] publish "${event}" -> ${subscribers.length} subscriber(s)`);

  subscribers.forEach((url) => {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload }),
    }).catch((err) => {
      // Lỗi ở 1 subscriber không được làm publish thất bại
      console.error(`[event-bus] gửi tới ${url} thất bại:`, err.message);
    });
  });

  return res.status(202).json({ data: { event, deliveredTo: subscribers.length } });
}

function listSubscriptionsHandler(req, res) {
  return res.status(200).json({ data: store.listAll() });
}

module.exports = { subscribeHandler, publishHandler, listSubscriptionsHandler };
