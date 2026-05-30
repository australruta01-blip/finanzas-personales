import React, { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
        <div style={{ fontSize: 13 }}>Cargando...</div>
      </div>
    </div>
  )

  return (
    <AuthContext.Provider value={{ session, user: session?.user }}>
      {session ? <Dashboard /> : <Login />}
    </AuthContext.Provider>
  )
}
