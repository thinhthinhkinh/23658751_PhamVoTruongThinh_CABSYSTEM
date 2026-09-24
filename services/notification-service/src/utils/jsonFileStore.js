const fs = require("fs");

// Lớp truy xuất file thấp nhất mà các DAO dùng để đọc/ghi data.json.
// Đây là bản thay thế đơn giản cho việc kết nối DB thật, đúng pattern
// Model -> DAO -> Repository -> Controller -> Routes đã học ở Bài 6.

function readData(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  return raw ? JSON.parse(raw) : [];
}

function writeData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { readData, writeData };
