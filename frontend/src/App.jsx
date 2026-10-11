import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Landing from './pages/Landing.jsx'
import ChooseBase from './pages/ChooseBase.jsx'
import ProductPage from './pages/ProductPage.jsx'
import StickerSoon from './pages/StickerSoon.jsx'
import Footer from './components/Footer.jsx'
import AuthModal from './components/AuthModal.jsx'
import { getMe, logout } from './api.js'

// Đổi trang thì lên đầu trang; link dạng /#combo thì cuộn tới đúng mục.
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) return el.scrollIntoView()
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
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
      <div className="backdrop" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="grain" />
      </div>
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
          <Route path="/combo/:slug" element={<ChooseBase />} />
          <Route path="/combo/:slug/:product" element={<ProductPage />} />
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
