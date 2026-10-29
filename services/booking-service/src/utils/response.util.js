// Chuẩn hóa format response theo quy ước chung trong tài liệu API Design:
// thành công  -> { data }  hoặc { data, meta }
// thất bại    -> { error: { code, message } }

function ok(res, data, status = 200) {
  return res.status(status).json({ data });
}

function okList(res, items, meta = {}) {
  return res.status(200).json({ data: items, meta });
}

function fail(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

module.exports = { ok, okList, fail };
