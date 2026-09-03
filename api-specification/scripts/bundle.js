// Gộp toàn bộ api-specification/ (nhiều file, có $ref liên file) thành 1 file YAML duy nhất
// tại bundled/cab-system-openapi.yaml — dùng khi cần upload lên Swagger Catalog, Postman, v.v.
//
// Cách chạy (từ thư mục api-specification/):
//   npm install --no-save @apidevtools/swagger-parser js-yaml
//   node scripts/bundle.js

const path = require("path");
const fs = require("fs");
const SwaggerParser = require("@apidevtools/swagger-parser");
const yaml = require("js-yaml");

async function main() {
  const rootFile = path.join(__dirname, "..", "openapi.yaml");
  const outFile = path.join(__dirname, "..", "bundled", "cab-system-openapi.yaml");

  console.log("Đang validate + gộp file, bắt đầu từ", rootFile, "...");
  await SwaggerParser.validate(rootFile); // throw nếu có lỗi cấu trúc/OpenAPI
  const dereferenced = await SwaggerParser.dereference(rootFile);

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, yaml.dump(dereferenced, { lineWidth: 100, noRefs: true }));

  console.log("✅ Đã tạo file gộp:", outFile);
  console.log("   Số path:", Object.keys(dereferenced.paths).length);
}

main().catch((err) => {
  console.error("❌ Lỗi khi gộp file:", err.message);
  process.exit(1);
});
