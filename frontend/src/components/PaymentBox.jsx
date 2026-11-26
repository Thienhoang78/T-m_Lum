import { useEffect, useRef, useState } from 'react'
import { getOrder } from '../api.js'
import { vnd } from '../data/pricing.js'
import { PAY_STATUS } from '../data/orderStatus.js'

const POLL_MS = 6000
const POLL_FOR_MS = 30 * 60 * 1000 // ngừng tự kiểm tra sau 30 phút

// Chép vào bộ nhớ tạm; trình duyệt chặn thì chọn sẵn chữ để khách tự chép
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false)
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      className="pay-copy"
      aria-label={`Chép ${label}`}
      onClick={async () => {
        if (!(await copyText(text))) return
        setDone(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setDone(false), 1600)
      }}
    >
      {done ? 'Đã chép' : 'Chép'}
    </button>
  )
}

// Lưu mã QR thành ảnh PNG (app ngân hàng chỉ đọc ảnh PNG / JPG trong thư viện ảnh, không đọc SVG)
async function saveQr(src, name) {
  const img = new Image()
  img.src = src
  await img.decode()
  const size = 720
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(img, 0, 0, size, size)
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// Hướng dẫn thanh toán của một đơn: mã VietQR + thông tin chuyển khoản (chuyển khoản / ví), hoặc COD.
// Webhook tự xác nhận đang bật (pay.autoConfirm) thì tự kiểm tra lại mỗi vài giây cho tới khi nhận đủ tiền.
// code + access ({ k } hoặc { phone }) dùng để tải lại đơn; onUpdate(order) báo đơn mới cho trang cha.
export default function PaymentBox({ code, access, pay: initial, onUpdate }) {
  const [pay, setPay] = useState(initial)
  const [checking, setChecking] = useState(false)
  const [checkMsg, setCheckMsg] = useState(null)
  useEffect(() => setPay(initial), [initial])
  const waiting = !!pay.transfer && !pay.transfer.missing && pay.status !== 'da-thanh-toan'
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  // tải lại đơn bằng cùng cách khách đang xem (mã bí mật trong link hoặc số điện thoại)
  const k = access?.k
  const phone = access?.phone

  useEffect(() => {
    if (!waiting || !pay.autoConfirm) return
    const until = Date.now() + POLL_FOR_MS
    const id = setInterval(async () => {
      if (Date.now() > until) return clearInterval(id)
      if (document.visibilityState !== 'visible') return
      try {
        const o = await getOrder(code, { k, phone })
        setPay(o.pay)
        onUpdateRef.current?.(o)
      } catch {
        // mất mạng một lúc: lần sau thử lại
      }
    }, POLL_MS)
    return () => clearInterval(id)
  }, [waiting, pay.autoConfirm, code, k, phone])

  async function checkNow() {
    setChecking(true)
    setCheckMsg(null)
    try {
      const o = await getOrder(code, { k, phone })
      setPay(o.pay)
      onUpdateRef.current?.(o)
      if (o.pay.status !== 'da-thanh-toan')
        setCheckMsg('Chưa thấy tiền về. Chuyển khoản liên ngân hàng có thể mất vài phút.')
    } catch (err) {
      setCheckMsg(err.message)
    } finally {
      setChecking(false)
    }
  }

  const st = PAY_STATUS[pay.status] ?? PAY_STATUS['chua-thanh-toan']

  if (pay.status === 'da-thanh-toan')
    return (
      <div className="pay-box pay-done" role="status">
        <span className="pay-check" aria-hidden="true">
          ✓
        </span>
        <div>
          <strong>Đã nhận thanh toán {vnd(pay.paid)}</strong>
          <p>Cảm ơn bạn! Studio bắt đầu chuẩn bị bộ kit ngay.</p>
        </div>
      </div>
    )

  if (pay.method === 'cod' || !pay.transfer)
    return (
      <div className="pay-box">
        <p className="pay-title">
          <span className={`st st-${st.tone}`}>{st.label}</span>
        </p>
        <p className="pay-text">
          {pay.method === 'cod'
            ? `Thanh toán ${vnd(pay.due)} khi nhận hàng (tiền mặt hoặc chuyển khoản cho shipper).`
            : pay.status === 'hoan-tien'
              ? 'Studio đã hoàn tiền cho đơn này.'
              : 'Đơn không cần thanh toán thêm.'}
        </p>
      </div>
    )

  const t = pay.transfer
  if (t.missing)
    return (
      <div className="pay-box">
        <p className="pay-title">
          <span className={`st st-${st.tone}`}>{st.label}</span> Chuyển khoản {vnd(t.amount)}
        </p>
        <p className="pay-text">
          Studio sẽ gửi số tài khoản qua điện thoại / Zalo khi xác nhận đơn. Nội dung chuyển khoản ghi{' '}
          <strong className="pay-ref">{t.ref}</strong> để studio khớp đơn nhanh.
        </p>
      </div>
    )

  return (
    <div className="pay-box">
      <p className="pay-title">
        <span className={`st st-${st.tone}`}>{st.label}</span>
        {pay.paid > 0 ? ` Đã nhận ${vnd(pay.paid)}, còn ${vnd(t.amount)}` : ' Quét mã để thanh toán'}
      </p>
      <div className="pay-grid">
        <figure className="pay-qr">
          <img
            src={t.qr}
            width="200"
            height="200"
            alt={`Mã VietQR chuyển ${vnd(t.amount)} tới tài khoản ${t.account}${t.bankName ? ` ${t.bankName}` : ''}, nội dung ${t.ref}`}
          />
          <figcaption>
            <button
              type="button"
              className="link"
              onClick={() => saveQr(t.qr, `VietQR-${t.ref}.png`).catch(() => {})}
            >
              Lưu ảnh mã QR
            </button>
          </figcaption>
        </figure>
        <dl className="pay-info">
          {t.bankName && (
            <div>
              <dt>Ngân hàng</dt>
              <dd>{t.bankName}</dd>
            </div>
          )}
          <div>
            <dt>Số tài khoản</dt>
            <dd>
              <span className="pay-mono">{t.account}</span>{' '}
              <CopyButton text={t.account} label="số tài khoản" />
            </dd>
          </div>
          {t.holder && (
            <div>
              <dt>Chủ tài khoản</dt>
              <dd>{t.holder}</dd>
            </div>
          )}
          <div>
            <dt>Số tiền</dt>
            <dd>
              <strong>{vnd(t.amount)}</strong> <CopyButton text={String(t.amount)} label="số tiền" />
            </dd>
          </div>
          <div>
            <dt>Nội dung</dt>
            <dd>
              <strong className="pay-ref">{t.ref}</strong>{' '}
              <CopyButton text={t.ref} label="nội dung chuyển khoản" />
            </dd>
          </div>
        </dl>
      </div>
      <p className="pay-text">
        Mở app ngân hàng, MoMo hoặc ZaloPay và quét mã: số tiền và nội dung đã có sẵn. Chuyển tay thì ghi đúng
        nội dung <strong className="pay-ref">{t.ref}</strong>.{' '}
        {pay.autoConfirm
          ? 'Trang tự cập nhật khi tiền về, thường dưới 1 phút.'
          : 'Studio sẽ xác nhận khi kiểm tra tài khoản và báo lại cho bạn.'}
      </p>
      {pay.autoConfirm && (
        <p className="pay-wait">
          <span className="pay-pulse" aria-hidden="true" /> Đang chờ tiền về…{' '}
          <button type="button" className="link" onClick={checkNow} disabled={checking}>
            {checking ? 'Đang kiểm tra…' : 'Kiểm tra ngay'}
          </button>
        </p>
      )}
      {checkMsg && (
        <p className="pay-text" role="status">
          {checkMsg}
        </p>
      )}
    </div>
  )
}
