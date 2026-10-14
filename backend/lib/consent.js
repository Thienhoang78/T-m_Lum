// Cam kết miễn trừ trách nhiệm bản quyền khi khách tự tải sticker lên.
// Giữ đúng nội dung và phiên bản với frontend/src/data/consent.js. Đổi nội dung thì đổi VERSION:
// đơn hàng lưu kèm phiên bản và toàn văn cam kết mà khách đã ký.
// BẢN NHÁP: nên nhờ người có chuyên môn pháp lý xem lại trước khi dùng chính thức.
export const WAIVER_VERSION = 'v1-2026-10-14'

export const WAIVER_TITLE = 'Cam kết miễn trừ trách nhiệm về bản quyền sticker tự tải lên'

export const WAIVER_TERMS = [
  'Tôi là tác giả hoặc có đầy đủ quyền sử dụng mọi hình ảnh tôi tải lên, kể cả nhân vật, logo, thương hiệu, tác phẩm nghệ thuật hay ảnh chân dung người khác có trong hình.',
  'Tôi tự chịu toàn bộ trách nhiệm đối với mọi khiếu nại về bản quyền, nhãn hiệu hoặc quyền sở hữu trí tuệ khác liên quan đến hình ảnh tôi tải lên, kể cả mọi thiệt hại phát sinh. Tùm Lum Studio được miễn trừ hoàn toàn trách nhiệm đối với các vấn đề này.',
  'Tùm Lum Studio có quyền từ chối in hình ảnh rõ ràng vi phạm bản quyền, vi phạm pháp luật hoặc phản cảm, và sẽ liên hệ để tôi đổi hình khác hoặc hoàn tiền phần đó.',
  'Hình ảnh tôi tải lên chỉ được dùng để thực hiện đơn hàng này.',
]

export const waiverText = () => [WAIVER_TITLE, ...WAIVER_TERMS.map((t, i) => `${i + 1}. ${t}`)].join('\n')
