import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        setSuccess('Cuenta creada. Revisa tu email para confirmar.')
        setMode('login')
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20,
      background: 'linear-gradient(135deg, #E1F5EE 0%, #F9F9F7 50%, #FAEEDA 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--gray-900)' }}>Finanzas Personales</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: 13, marginTop: 4 }}>
            Controla tus ingresos, gastos y metas
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', marginBottom: 24, background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{
                  flex: 1, padding: '7px 0', border: 'none', borderRadius: 6,
                  fontWeight: 500, fontSize: 13, transition: 'all .15s',
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? 'var(--gray-900)' : 'var(--gray-400)',
                  boxShadow: mode === m ? 'var(--shadow)' : 'none'
                }}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label>Nombre completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre" required />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'} required />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width: '100%', marginTop: 4, padding: '11px 0' }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-400)', marginTop: 20 }}>
          Tus datos son privados y seguros
        </p>
      </div>
    </div>
  )
}
