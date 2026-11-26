// Dữ liệu đơn gửi ra ngoài: bản tóm tắt cho danh sách, bản đầy đủ (không có cam kết, IP, mã bí mật) cho khách.
// Nhãn hiển thị (trạng thái, phương thức...) nằm ở frontend/src/data/orderStatus.js.

export const ORDER_STATUSES = ['cho-xac-nhan', 'dang-lam', 'dang-giao', 'hoan-tat', 'da-huy']

export const orderSummary = (o) => ({
  code: o.code,
  createdAt: o.createdAt,
  status: o.status,
  product: o.product,
  comboName: o.combo?.name,
  size: o.size,
  qty: o.qty,
  total: o.totals?.total ?? 0,
  delivery: o.delivery,
  payment: o.payment,
  paymentStatus: o.paymentStatus ?? 'chua-thanh-toan',
  paidAmount: o.paidAmount ?? 0,
  customer: { name: o.customer?.name, phone: o.customer?.phone, province: o.customer?.province },
})

export const publicOrder = (o, pay) => ({
  ...orderSummary(o),
  choice: o.choice,
  stickerSets: (o.stickerSets?.length ? o.stickerSets : o.stickerSet?.key ? [o.stickerSet] : []).map((s) => ({
    name: s.name,
    qty: s.qty,
  })),
  sheets: o.sheets ?? {},
  customCount: o.customStickers?.length ?? 0,
  customer: o.customer,
  voucher: o.voucher,
  totals: o.totals,
  pay,
})
