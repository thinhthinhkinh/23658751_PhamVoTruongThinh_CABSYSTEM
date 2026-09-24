// Model: bản ghi xử lý sự cố cho 1 chuyến (FR-21)
// Admin Service không sở hữu dữ liệu Trip, nên chỉ lưu log xử lý riêng ở đây,
// thay vì chỉnh sửa trực tiếp trạng thái Trip (việc đó do chính Trip Service quản lý).
function createResolvedIssue({ id, tripId, resolutionNote, resolvedBy }) {
  return { id, tripId, resolutionNote, resolvedBy, resolvedAt: new Date().toISOString() };
}

module.exports = { createResolvedIssue };
