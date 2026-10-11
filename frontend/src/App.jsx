import { useEffect, useState } from 'react'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Marquee from './components/Marquee.jsx'
import Steps from './components/Steps.jsx'
import Combos from './components/Combos.jsx'
import Footer from './components/Footer.jsx'
import AuthModal from './components/AuthModal.jsx'
import { getMe, logout } from './api.js'

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
      <main>
        <Hero />
        <Marquee />
        <Steps />
        <Combos />
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
