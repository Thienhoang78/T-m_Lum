import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Overview from './Overview.jsx'
import { OrderDetail, OrderList } from './Orders.jsx'
import { CustomerDetail, CustomerList } from './Customers.jsx'
import Payments from './Payments.jsx'
import './admin.css'

// Trang quản lý bán hàng (CRM) của studio: /quan-ly. Chỉ tài khoản role 'admin' vào được
// (cấp quyền: npm run make-admin -w backend -- email), API cũng kiểm tra lại quyền ở server.
const TABS = [
  ['/quan-ly', 'Tổng quan', true],
  ['/quan-ly/don-hang', 'Đơn hàng'],
  ['/quan-ly/khach-hang', 'Khách hàng'],
  ['/quan-ly/giao-dich', 'Giao dịch'],
]

function Gate({ title, children }) {
  return (
    <div className="page admin-gate">
      <p className="eyebrow">Trang quản lý</p>
      <h1 className="display-sm">{title}</h1>
      {children}
    </div>
  )
}

export default function AdminPage({ user, userReady, onLogin }) {
  if (!userReady) return <p className="page">Đang kiểm tra tài khoản…</p>
  if (!user)
    return (
      <Gate title="Đăng nhập để vào trang quản lý">
        <p>Dùng tài khoản đã được cấp quyền quản lý của studio.</p>
        <button type="button" className="btn btn-brand" onClick={onLogin}>
          Đăng nhập
        </button>
      </Gate>
    )
  if (user.role !== 'admin')
    return (
      <Gate title="Tài khoản này chưa có quyền quản lý">
        <p>
          Người quản trị cấp quyền bằng lệnh <code>npm run make-admin -w backend -- {user.email}</code> (xem
          README), rồi bạn đăng xuất và đăng nhập lại.
        </p>
      </Gate>
    )

  return (
    <div className="admin">
      <header className="admin-head">
        <div>
          <p className="eyebrow">Tùm Lum Studio</p>
          <h1 className="admin-title">Quản lý bán hàng</h1>
        </div>
        <nav className="admin-tabs" aria-label="Trang quản lý">
          {TABS.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="don-hang" element={<OrderList />} />
        <Route path="don-hang/:code" element={<OrderDetail />} />
        <Route path="khach-hang" element={<CustomerList />} />
        <Route path="khach-hang/:phone" element={<CustomerDetail />} />
        <Route path="giao-dich" element={<Payments />} />
        <Route path="*" element={<Navigate to="/quan-ly" replace />} />
      </Routes>
    </div>
  )
}
