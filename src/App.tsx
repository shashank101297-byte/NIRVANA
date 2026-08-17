import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) {
        setError(error.message)
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

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setSigningIn(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      setSession(data.session)
    }

    setSigningIn(false)
  }

  async function handleSignOut() {
    setError('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <main className="nirvana-screen">
        <div className="nirvana-card">
          <div className="nirvana-mark">N</div>
          <h1>NIRVANA</h1>
          <p>Initializing secure session...</p>
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="nirvana-screen">
        <section className="nirvana-card">
          <div className="nirvana-mark">N</div>

          <h1>NIRVANA</h1>
          <p className="nirvana-subtitle">
            Integrated Healthcare Platform
          </p>

          <form onSubmit={handleSignIn} className="nirvana-form">
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
              {signingIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="nirvana-security">
            🔐 Secure authentication powered by Supabase
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="nirvana-screen">
      <section className="nirvana-card">
        <div className="nirvana-mark">N</div>

        <h1>Welcome to NIRVANA</h1>

        <p className="nirvana-subtitle">
          Secure session established.
        </p>

        <div className="nirvana-user">
          <span>Authenticated user</span>
          <strong>{session.user.email}</strong>
        </div>

        {error && (
          <div className="nirvana-error" role="alert">
            {error}
          </div>
        )}

        <button onClick={handleSignOut}>
          Sign out
        </button>
      </section>
    </main>
  )
}

export default App
