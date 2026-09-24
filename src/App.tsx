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
import { OrganizationProvider, useOrganization } from './context/OrganizationContext'
import './App.css'
import PatientsPage from './pages/patients/PatientsPage'
import ArchivedPatientsPage from './pages/patients/ArchivedPatientsPage'
import PatientDetailPage from './pages/patients/PatientDetailPage'
import EditPatientPage from './pages/patients/EditPatientPage'
import ClinicalWorkspacePage from './pages/clinical/ClinicalWorkspacePage'
import ClinicalEncounterPage from './pages/clinical/ClinicalEncounterPage'
import ClinicalEncountersPage from './pages/clinical/ClinicalEncountersPage'
import AppointmentsPage from './pages/appointments/AppointmentsPage'

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

          <NavLink to="/appointments" className="module-card">
            <span className="module-icon">📅</span>
            <strong>Appointments</strong>
            <span>Scheduling and appointment workspace</span>
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

function OrganizationSwitcher() {
  const {
    organizations,
    activeOrganization,
    activeOrganizationId,
    loading,
    error,
    setActiveOrganization,
  } = useOrganization()
  const [open, setOpen] = useState(false)

  if (loading) {
    return (
      <div className="organization-switcher organization-switcher-loading">
        <span className="organization-switcher-label">Organization</span>
        <strong>Loading…</strong>
      </div>
    )
  }

  const currentOrganizationName =
    activeOrganization?.name ?? organizations[0]?.name ?? 'No organization available'

  const isSingleOrganization = organizations.length <= 1

  const handleSelect = async (organizationId: string) => {
    await setActiveOrganization(organizationId)
    setOpen(false)
  }

  return (
    <div className="organization-switcher-wrap">
      <button
        type="button"
        className={`organization-switcher ${isSingleOrganization ? 'organization-switcher-single' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Current organization selection"
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="organization-switcher-label">Current organization</span>
        <span className="organization-switcher-value">
          {currentOrganizationName}
          <span className="organization-switcher-caret">{open ? '▴' : '▾'}</span>
        </span>
      </button>

      {open && (
        <div className="organization-menu" role="menu" aria-label="Organization menu">
          {organizations.length === 0 ? (
            <div className="organization-menu-item organization-menu-item-disabled" role="menuitem">
              No organization access available
            </div>
          ) : isSingleOrganization ? (
            <button
              type="button"
              className="organization-menu-item organization-menu-item-active"
              role="menuitemradio"
              aria-checked="true"
              onClick={() => setOpen(false)}
            >
              <span>{currentOrganizationName}</span>
              <span className="organization-menu-check">✓</span>
            </button>
          ) : (
            organizations.map((organization) => (
              <button
                key={organization.id}
                type="button"
                className={`organization-menu-item ${
                  activeOrganizationId === organization.id ? 'organization-menu-item-active' : ''
                }`}
                role="menuitemradio"
                aria-checked={activeOrganizationId === organization.id}
                onClick={() => void handleSelect(organization.id)}
              >
                <span>{organization.name}</span>
                {activeOrganizationId === organization.id && (
                  <span className="organization-menu-check">✓</span>
                )}
              </button>
            ))
          )}

          {error && <div className="organization-menu-error">{error}</div>}
        </div>
      )}
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
  const { activeOrganization, organizations, loading } = useOrganization()
  const hasOrganizationAccess = organizations.length > 0 && !!activeOrganization

  if (loading) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <NavLink to="/" className="brand">
            <span className="brand-mark-small">N</span>
            <span>NIRVANA</span>
          </NavLink>
        </header>
        <main className="content">
          <div className="page">
            <p className="eyebrow">ORGANIZATION</p>
            <h1>Loading your organization access…</h1>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark-small">N</span>
          <span>NIRVANA</span>
        </NavLink>

        <div className="topbar-meta">
          <OrganizationSwitcher />

          <div className="topbar-user">
            <span>{email}</span>
            <button className="signout-button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="content">
        {!hasOrganizationAccess ? (
          <div className="page">
            <div className="account-card">
              <p className="eyebrow">ORGANIZATION ACCESS</p>
              <h1>No organization access</h1>
              <p>
                This account is not currently assigned to an active organization.
                Contact your administrator to request access.
              </p>
              <button type="button" className="secondary-button" onClick={() => void onSignOut()}>
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage email={email} />} />
            <Route path="/patients" element={<PatientsPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/clinical" element={<ClinicalWorkspacePage />} />
            <Route path="/clinical/:patientId" element={<ClinicalWorkspacePage />} />
        <Route
          path="/clinical/:patientId/encounters"
          element={<ClinicalEncountersPage />}
        />
      <Route
        path="/clinical/:patientId/encounter/:encounterId"
        element={<ClinicalEncounterPage />}
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

            <Route path="/profile" element={<ProfilePage email={email} />} />

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
            <Route path="/patients/:id/edit" element={<EditPatientPage />} />
            <Route path="/patients/archived" element={<ArchivedPatientsPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
          </Routes>
        )}
      </main>

      {hasOrganizationAccess && (
        <nav className="bottom-nav">
          <NavLink to="/" end>
            <span>⌂</span>
            Home
          </NavLink>

          <NavLink to="/patients">
            <span>👥</span>
            Patients
          </NavLink>

          <NavLink to="/appointments">
            <span>📅</span>
            Appointments
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
      )}
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
        <OrganizationProvider>
          <ProtectedApp session={session} onSignOut={handleSignOut} />
        </OrganizationProvider>
      )}
    </BrowserRouter>
  )
}

export default App
