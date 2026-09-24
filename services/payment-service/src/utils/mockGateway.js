const { v4: uuidv4 } = require("uuid");

// Mô phỏng cổng thanh toán bên thứ ba (BR-06: hệ thống CAB không lưu thông tin thẻ/tài
// khoản thanh toán nhạy cảm, mọi thứ đi qua đây và chỉ trả về providerRef tham chiếu).
// Tiền mặt luôn "thành công" ngay (không qua cổng ngoài). Điện tử mô phỏng tỷ lệ thành công 85%.
async function charge({ method, amount }) {
  if (method === "cash") {
    return { success: true, providerRef: null };
  }
  const success = Math.random() < 0.85;
  return {
    success,
    providerRef: success ? `PROV-${uuidv4().slice(0, 8).toUpperCase()}` : null,
    reason: success ? null : "Ngân hàng/ví điện tử từ chối giao dịch (mô phỏng)",
  };
}

module.exports = { charge };
