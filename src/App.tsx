import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import './App.css'
import PatientsPage from './pages/patients/PatientsPage'
import ArchivedPatientsPage from './pages/patients/ArchivedPatientsPage'
import PatientDetailPage from './pages/patients/PatientDetailPage'
import EditPatientPage from './pages/patients/EditPatientPage'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSigningIn(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setError(error.message)
      setSigningIn(false)
      return
    }

    navigate('/')
    setSigningIn(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">N</div>

        <h1>NIRVANA</h1>
        <p className="subtitle">Integrated Healthcare Platform</p>

        <form onSubmit={handleSignIn} className="auth-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {error && (
            <div className="nirvana-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={signingIn}>
            {signingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="security-note">
          🔐 Secure authentication powered by Supabase
        </p>
      </section>
    </main>
  )
}

function HomePage({ email }: { email: string }) {
  return (
    <div className="page">
      <div className="welcome">
        <p className="eyebrow">NIRVANA FOUNDATION V1</p>
        <h1>Good to see you.</h1>
        <p>
          Welcome to your integrated healthcare workspace.
        </p>
      </div>

      <div className="module-grid">
        <NavLink to="/patients" className="module-card">
          <span className="module-icon">👥</span>
          <strong>Patients</strong>
          <span>Patient management workspace</span>
        </NavLink>

        <NavLink to="/clinical" className="module-card">
          <span className="module-icon">🩺</span>
          <strong>Clinical</strong>
          <span>Clinical decision workspace</span>
        </NavLink>

        <NavLink to="/research" className="module-card">
          <span className="module-icon">📚</span>
          <strong>Research</strong>
          <span>Research and academic workspace</span>
        </NavLink>

        <NavLink to="/settings" className="module-card">
          <span className="module-icon">⚙️</span>
          <strong>Settings</strong>
          <span>Platform configuration</span>
        </NavLink>
      </div>

      <div className="account-card">
        <span>Authenticated account</span>
        <strong>{email}</strong>
      </div>
    </div>
  )
}

function ModulePage({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: string
}) {
  return (
    <div className="page">
      <div className="module-header">
        <span className="large-icon">{icon}</span>
        <div>
          <p className="eyebrow">NIRVANA MODULE</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="coming-soon">
        <strong>Foundation V1</strong>
        <span>This module is reserved for the next development phase.</span>
      </div>
    </div>
  )
}

function ProfilePage({ email }: { email: string }) {
  return (
    <div className="page">
      <p className="eyebrow">ACCOUNT</p>
      <h1>Profile</h1>

      <div className="account-card">
        <span>Authenticated email</span>
        <strong>{email}</strong>
      </div>
    </div>
  )
}

function ProtectedApp({
  session,
  onSignOut,
}: {
  session: Session
  onSignOut: () => Promise<void>
}) {
  const email = session.user.email ?? 'Authenticated user'

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark-small">N</span>
          <span>NIRVANA</span>
        </NavLink>

        <div className="topbar-user">
          <span>{email}</span>
          <button className="signout-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage email={email} />} />
      <Route
        path="/patients"
        element={<PatientsPage />}
      />
          <Route
            path="/clinical"
            element={
              <ModulePage
                title="Clinical"
                description="Clinical tools and decision support will be built here."
                icon="🩺"
              />
            }
          />

          <Route
            path="/research"
            element={
              <ModulePage
                title="Research"
                description="Research, academics and evidence workspace."
                icon="📚"
              />
            }
          />

          <Route
            path="/profile"
            element={<ProfilePage email={email} />}
          />

          <Route
            path="/settings"
            element={
              <ModulePage
                title="Settings"
                description="NIRVANA platform settings will be built here."
                icon="⚙️"
              />
            }
          />
            <Route
          path="/patients/:id/edit"
          element={<EditPatientPage />}
        />
      <Route
          path="/patients/archived"
          element={<ArchivedPatientsPage />}
        />
        <Route
          path="/patients/:id"
          element={<PatientDetailPage />}
        />
      </Routes>
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" end>
          <span>⌂</span>
          Home
        </NavLink>

        <NavLink to="/patients">
          <span>👥</span>
          Patients
        </NavLink>

        <NavLink to="/clinical">
          <span>🩺</span>
          Clinical
        </NavLink>

        <NavLink to="/profile">
          <span>👤</span>
          Profile
        </NavLink>
      </nav>
    </div>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) {
        console.error(error)
      }

      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (loading) {
    return (
      <main className="loading-page">
        <div className="brand-mark">N</div>
        <h1>NIRVANA</h1>
        <p>Loading secure session…</p>
      </main>
    )
  }

  return (
    <BrowserRouter>
      {!session ? (
        <LoginPage />
      ) : (
        <ProtectedApp session={session} onSignOut={handleSignOut} />
      )}
    </BrowserRouter>
  )
}

export default App
