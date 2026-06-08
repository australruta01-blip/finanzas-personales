import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function Perfil({ userId, userEmail, onToast, onAvatarChange }) {
  const [nombre, setNombre] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorPerfil, setErrorPerfil] = useState('')

  // Contraseña
  const [pwActual, setPwActual] = useState('')
  const [pwNueva, setPwNueva] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [errorPw, setErrorPw] = useState('')
  const [showPwSection, setShowPwSection] = useState(false)

  const fileRef = useRef()

  // ─── Fetch perfil ─────────────────────────────────────────
  const fetchPerfil = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('perfiles')
      .select('nombre_display, avatar_url')
      .eq('id', userId)
      .single()
    if (data) {
      setNombre(data.nombre_display || '')
      setAvatarUrl(data.avatar_url || '')
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchPerfil() }, [fetchPerfil])

  // ─── Seleccionar imagen ───────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrorPerfil('La imagen no puede superar 2MB')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
    setErrorPerfil('')
  }

  // ─── Guardar perfil ───────────────────────────────────────
  async function handleSavePerfil(e) {
    e.preventDefault()
    setSaving(true)
    setErrorPerfil('')
    try {
      let finalAvatarUrl = avatarUrl

      // Subir avatar si se seleccionó uno
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${userId}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        if (upErr) {
          // Si el bucket no existe aún, guardar como base64 en el perfil
          finalAvatarUrl = avatarPreview
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          finalAvatarUrl = urlData.publicUrl + `?t=${Date.now()}`
        }
      }

      // Upsert en tabla perfiles
      const { error: err } = await supabase.from('perfiles').upsert({
        id: userId,
        nombre_display: nombre.trim(),
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString()
      })
      if (err) throw err

      setAvatarUrl(finalAvatarUrl)
      setAvatarPreview(null)
      setAvatarFile(null)
      onAvatarChange?.({ nombre: nombre.trim(), avatarUrl: finalAvatarUrl })
      onToast?.('Perfil actualizado ✓')
    } catch (err) {
      setErrorPerfil(err.message)
    }
    setSaving(false)
  }

  // ─── Cambiar contraseña ───────────────────────────────────
  async function handleChangePassword(e) {
    e.preventDefault()
    if (pwNueva !== pwConfirm) { setErrorPw('Las contraseñas no coinciden'); return }
    if (pwNueva.length < 6) { setErrorPw('La contraseña debe tener al menos 6 caracteres'); return }
    setSavingPw(true)
    setErrorPw('')
    const { error } = await supabase.auth.updateUser({ password: pwNueva })
    if (error) {
      setErrorPw(error.message)
    } else {
      setPwActual(''); setPwNueva(''); setPwConfirm('')
      setShowPwSection(false)
      onToast?.('Contraseña actualizada ✓')
    }
    setSavingPw(false)
  }

  // ─── Avatar display ───────────────────────────────────────
  const displayAvatar = avatarPreview || avatarUrl
  const iniciales = (nombre || userEmail || 'U').slice(0, 2).toUpperCase()

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Cargando perfil...</div>

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 20 }}>Mi perfil</h2>

      {/* ── Sección de foto y nombre ── */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--gray-600)' }}>
          Información personal
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--teal-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 700, color: 'var(--teal-dark)',
              border: '3px solid var(--gray-200)'
            }}>
              {displayAvatar
                ? <img src={displayAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : iniciales
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 24, height: 24, borderRadius: '50%',
                background: 'var(--gray-900)', color: '#fff',
                border: '2px solid #fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12
              }}
              title="Cambiar foto">
              📷
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange}
              style={{ display: 'none' }} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{nombre || 'Sin nombre'}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{userEmail}</div>
            <button onClick={() => fileRef.current?.click()}
              style={{
                marginTop: 6, fontSize: 11, padding: '3px 10px',
                border: '1px solid var(--gray-200)', borderRadius: 6,
                background: '#fff', cursor: 'pointer', color: 'var(--gray-600)'
              }}>
              {displayAvatar ? 'Cambiar foto' : 'Agregar foto'}
            </button>
            {avatarPreview && (
              <button onClick={() => { setAvatarPreview(null); setAvatarFile(null) }}
                style={{
                  marginTop: 6, marginLeft: 6, fontSize: 11, padding: '3px 10px',
                  border: '1px solid #FCEBEB', borderRadius: 6,
                  background: '#FCEBEB', cursor: 'pointer', color: '#791F1F'
                }}>
                Cancelar
              </button>
            )}
          </div>
        </div>

        {errorPerfil && <div className="error-msg">{errorPerfil}</div>}

        <form onSubmit={handleSavePerfil}>
          <div className="form-group">
            <label>Nombre para mostrar</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="¿Cómo quieres que te llamemos?" />
          </div>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input type="email" value={userEmail} disabled
              style={{ background: 'var(--gray-100)', color: 'var(--gray-400)' }} />
            <div style={{ fontSize: 11, color: 'var(--gray-300)', marginTop: 4 }}>
              El correo no se puede cambiar desde aquí
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}
            style={{ width: '100%', padding: '10px 0' }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* ── Sección de contraseña ── */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPwSection ? 16 : 0 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-600)' }}>Seguridad</div>
            {!showPwSection && (
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>Cambiar contraseña de acceso</div>
            )}
          </div>
          <button onClick={() => { setShowPwSection(v => !v); setErrorPw('') }}
            style={{
              fontSize: 12, padding: '5px 12px',
              border: '1px solid var(--gray-200)', borderRadius: 8,
              background: showPwSection ? 'var(--gray-100)' : '#fff',
              color: 'var(--gray-600)', cursor: 'pointer', fontWeight: 500
            }}>
            {showPwSection ? 'Cancelar' : 'Cambiar contraseña'}
          </button>
        </div>

        {showPwSection && (
          <>
            {errorPw && <div className="error-msg">{errorPw}</div>}
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Nueva contraseña</label>
                <input type="password" value={pwNueva} onChange={e => setPwNueva(e.target.value)}
                  placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>
              <div className="form-group">
                <label>Confirmar nueva contraseña</label>
                <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                  placeholder="Repite la nueva contraseña" required />
              </div>
              {pwNueva && pwConfirm && (
                <div style={{
                  fontSize: 11, marginBottom: 10, padding: '4px 8px', borderRadius: 6,
                  background: pwNueva === pwConfirm ? '#EAF3DE' : '#FCEBEB',
                  color: pwNueva === pwConfirm ? '#27500A' : '#791F1F'
                }}>
                  {pwNueva === pwConfirm ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                </div>
              )}
              <PasswordStrength password={pwNueva} />
              <button type="submit" className="btn-primary" disabled={savingPw}
                style={{ width: '100%', padding: '10px 0', marginTop: 8 }}>
                {savingPw ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* ── Info de sesión ── */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-600)', marginBottom: 10 }}>
          Sesión
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <div>
            <div style={{ color: 'var(--gray-600)' }}>Usuario activo</div>
            <div style={{ color: 'var(--gray-400)', fontSize: 11, marginTop: 1 }}>{userEmail}</div>
          </div>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#1D9E75'
          }} title="Sesión activa" />
        </div>
      </div>
    </div>
  )
}

// ─── Indicador de fortaleza de contraseña ────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { label: 'Muy débil', color: '#D85A30' },
    { label: 'Débil', color: '#BA7517' },
    { label: 'Moderada', color: '#BA7517' },
    { label: 'Fuerte', color: '#1D9E75' },
    { label: 'Muy fuerte', color: '#1D9E75' },
  ]
  const lvl = levels[score]

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < score ? lvl.color : 'var(--gray-200)',
            transition: 'background .2s'
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: lvl.color }}>{lvl.label}</div>
    </div>
  )
}
