import { Suspense, lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Landing from './pages/Landing.jsx'
import AboutPage from './components/About.jsx'
import { BasicOrder, LegacyComboRedirect, PremiumOrder } from './pages/OrderRoutes.jsx'
import Footer from './components/Footer.jsx'
import ScrollFx from './components/ScrollFx.jsx'
import AuthModal from './components/AuthModal.jsx'
import OrderTrack from './pages/OrderTrack.jsx'
import MyOrders from './pages/MyOrders.jsx'
import { getMe, logout } from './api.js'

// Trang quản lý (CRM) chỉ tải khi mở, khách mua hàng không phải tải phần này
const AdminPage = lazy(() => import('./pages/admin/AdminPage.jsx'))

// Đổi trang thì lên đầu trang; link dạng /#combo thì cuộn tới đúng mục.
// Điều hướng kèm state { keepScroll: true } (vd. đổi combo ngay trên trang áo) thì giữ nguyên vị trí.
function ScrollManager() {
  const { pathname, hash, state } = useLocation()
  const keep = !!state?.keepScroll
  useEffect(() => {
    if (keep) return
    const el = hash && document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash, keep])
  return null
}

export default function App() {
  const [authMode, setAuthMode] = useState(null) // 'login' | 'register' | null
  const [user, setUser] = useState(null)
  const [userReady, setUserReady] = useState(false) // đã hỏi xong máy chủ ai đang đăng nhập
  const { pathname } = useLocation()
  const inAdmin = pathname.startsWith('/quan-ly')

  useEffect(() => {
    getMe()
      .then(setUser)
      .finally(() => setUserReady(true))
  }, [])

  async function handleLogout() {
    await logout().catch(() => {})
    setUser(null)
  }

  return (
    <>
      <Nav
        user={user}
        onLogin={() => setAuthMode('login')}
        onRegister={() => setAuthMode('register')}
        onLogout={handleLogout}
      />
      <ScrollManager />
      <ScrollFx />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/basic/:product" element={<BasicOrder user={user} />} />
          <Route path="/premium" element={<PremiumOrder />} />
          <Route path="/ve-chung-toi" element={<AboutPage />} />
          <Route path="/don-hang" element={<MyOrders user={user} onLogin={() => setAuthMode('login')} />} />
          <Route path="/don-hang/:code" element={<OrderTrack user={user} />} />
          <Route
            path="/quan-ly/*"
            element={
              <Suspense fallback={<p className="page">Đang tải trang quản lý…</p>}>
                <AdminPage user={user} userReady={userReady} onLogin={() => setAuthMode('login')} />
              </Suspense>
            }
          />
          {/* link cũ theo combo */}
          <Route path="/combo/:slug" element={<Navigate to="/#combo" replace />} />
          <Route path="/combo/:slug/:product/*" element={<LegacyComboRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!inAdmin && <Footer onRegister={() => setAuthMode('register')} />}
      {authMode && (
        <AuthModal
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setAuthMode(null)}
          onAuthed={(u) => {
            setUser(u)
            setAuthMode(null)
          }}
        />
      )}
    </>
  )
}
