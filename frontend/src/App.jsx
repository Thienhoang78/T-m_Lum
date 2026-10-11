import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Landing from './pages/Landing.jsx'
import ProductPage from './pages/ProductPage.jsx'
import StickerSoon from './pages/StickerSoon.jsx'
import Footer from './components/Footer.jsx'
import AuthModal from './components/AuthModal.jsx'
import { getMe, logout } from './api.js'

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

  useEffect(() => {
    getMe().then(setUser)
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
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/combo/:slug" element={<Navigate to="/#combo" replace />} />
          <Route path="/combo/:slug/:product" element={<ProductPage user={user} />} />
          <Route path="/combo/:slug/:product/sticker" element={<StickerSoon />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer onRegister={() => setAuthMode('register')} />
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
