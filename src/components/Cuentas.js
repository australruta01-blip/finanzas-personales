import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmModal from './ConfirmModal'

function fmt(n) {
  const num = Number(n)
  const hasDecimals = num % 1 !== 0
  return '$' + (hasDecimals
    ? num.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : Math.round(num).toLocaleString('es-CL'))
}

const TIPOS_CUENTA = [
  { value: 'banco',      label: 'Cuenta bancaria', icono: '🏦' },
  { value: 'credito',    label: 'Tarjeta crédito',  icono: '💳' },
  { value: 'debito',     label: 'Tarjeta débito',   icono: '🏧' },
  { value: 'efectivo',   label: 'Efectivo / Wallet', icono: '💵' },
  { value: 'inversion',  label: 'Inversión',         icono: '📈' },
  { value: 'otro',       label: 'Otro',              icono: '📂' },
]

const COLORES = ['#1D9E75','#D85A30','#BA7517','#378ADD','#7F77DD','#D4537E','#5BB5C8','#888780']

const ICONOS = ['🏦','💳','🏧','💵','📈','💰','🏛️','🐷','📂','💼']

export default function Cuentas({ userId, onToast }) {
  const [cuentas, setCuentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Form state
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('banco')
  const [institucion, setInstitucion] = useState('')
  const [ultimos4, setUltimos4] = useState('')
  const [saldo, setSaldo] = useState('')
  const [color, setColor] = useState('#1D9E75')
  const [icono, setIcono] = useState('🏦')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // ─── Fetch ────────────────────────────────────────────────
  const fetchCuentas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cuentas')
      .select('*')
      .eq('user_id', userId)
      .eq('activa', true)
      .order('created_at', { ascending: true })
    setCuentas(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchCuentas() }, [fetchCuentas])

  // ─── Form helpers ─────────────────────────────────────────
  function openNew() {
    setEditando(null)
    setNombre(''); setTipo('banco'); setInstitucion(''); setUltimos4('')
    setSaldo(''); setColor('#1D9E75'); setIcono('🏦'); setError('')
    setShowForm(true)
  }

  function openEdit(cuenta) {
    setEditando(cuenta)
    setNombre(cuenta.nombre); setTipo(cuenta.tipo); setInstitucion(cuenta.institucion || '')
    setUltimos4(cuenta.numero_ultimos4 || ''); setSaldo(cuenta.saldo_inicial || '')
    setColor(cuenta.color || '#1D9E75'); setIcono(cuenta.icono || '🏦'); setError('')
    setShowForm(true)
  }

  // Al cambiar tipo, auto-sugerir icono
  function handleTipoChange(t) {
    setTipo(t)
    const found = TIPOS_CUENTA.find(tc => tc.value === t)
    if (found) setIcono(found.icono)
  }

  // ─── Submit ───────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true); setError('')
    const payload = {
      user_id: userId,
      nombre: nombre.trim(),
      tipo,
      institucion: institucion.trim(),
      numero_ultimos4: ultimos4.trim(),
      saldo_inicial: parseFloat(saldo) || 0,
      color,
      icono
    }
    try {
      if (editando?.id) {
        const { error: err } = await supabase.from('cuentas').update(payload).eq('id', editando.id)
        if (err) throw err
        onToast?.('Cuenta actualizada ✓')
      } else {
        const { error: err } = await supabase.from('cuentas').insert([payload])
        if (err) throw err
        onToast?.('Cuenta creada ✓')
      }
      setShowForm(false)
      fetchCuentas()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  // ─── Eliminar ─────────────────────────────────────────────
  async function confirmDeleteAction() {
    // Soft delete: marcar como inactiva
    await supabase.from('cuentas').update({ activa: false }).eq('id', confirmDelete)
    setConfirmDelete(null)
    fetchCuentas()
    onToast?.('Cuenta eliminada')
  }

  // ─── Resumen ──────────────────────────────────────────────
  const totalSaldo = useMemo(() =>
    cuentas.reduce((s, c) => s + Number(c.saldo_inicial || 0), 0),
    [cuentas]
  )

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Cargando cuentas...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Mis cuentas</h2>
        <button onClick={openNew} className="btn-primary" style={{ padding: '8px 16px' }}>
          + Nueva cuenta
        </button>
      </div>

      {/* KPI total */}
      {cuentas.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--teal-light)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
            <span style={{ color: 'var(--teal-dark)' }}>
              Saldo total registrado: <strong>{fmt(totalSaldo)}</strong>
            </span>
          </div>
          <div style={{ background: 'var(--gray-100)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
            <span style={{ color: 'var(--gray-600)' }}>
              {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
            {editando ? 'Editar cuenta' : 'Nueva cuenta'}
          </div>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            {/* Tipo */}
            <div className="form-group">
              <label>Tipo de cuenta</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {TIPOS_CUENTA.map(tc => (
                  <button key={tc.value} type="button" onClick={() => handleTipoChange(tc.value)}
                    style={{
                      padding: '8px 4px', border: '1.5px solid',
                      borderColor: tipo === tc.value ? 'var(--teal)' : 'var(--gray-200)',
                      borderRadius: 8,
                      background: tipo === tc.value ? 'var(--teal-light)' : '#fff',
                      color: tipo === tc.value ? 'var(--teal-dark)' : 'var(--gray-600)',
                      fontWeight: tipo === tc.value ? 600 : 400,
                      fontSize: 11, cursor: 'pointer', textAlign: 'center'
                    }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{tc.icono}</div>
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Nombre de la cuenta</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Cuenta RUT, Visa Santander" required />
              </div>

              <div className="form-group">
                <label>Institución (opcional)</label>
                <input type="text" value={institucion} onChange={e => setInstitucion(e.target.value)}
                  placeholder="Ej: Banco Estado, BICE" />
              </div>

              <div className="form-group">
                <label>Últimos 4 dígitos</label>
                <input type="text" value={ultimos4} onChange={e => setUltimos4(e.target.value.slice(0, 4))}
                  placeholder="1234" maxLength={4} pattern="\d{0,4}" />
              </div>
            </div>

            <div className="form-group">
              <label>Saldo inicial (CLP)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, color: 'var(--gray-400)' }}>$</span>
                <input type="number" value={saldo} onChange={e => setSaldo(e.target.value)}
                  placeholder="0" step="0.01" style={{ flex: 1 }} />
              </div>
            </div>

            {/* Color e icono */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Color de tarjeta</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COLORES.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      style={{
                        width: 26, height: 26, borderRadius: '50%', background: c, border: '3px solid',
                        borderColor: color === c ? 'var(--gray-900)' : 'transparent', cursor: 'pointer'
                      }} />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Icono</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ICONOS.map(ic => (
                    <button key={ic} type="button" onClick={() => setIcono(ic)}
                      style={{
                        width: 32, height: 32, borderRadius: 6, fontSize: 16, border: '1.5px solid',
                        borderColor: icono === ic ? 'var(--teal)' : 'var(--gray-200)',
                        background: icono === ic ? 'var(--teal-light)' : '#fff', cursor: 'pointer'
                      }}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" className="btn-primary" disabled={saving}
                style={{ flex: 1, padding: '10px 0' }}>
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear cuenta'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost"
                style={{ flex: 1, padding: '10px 0' }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de cuentas */}
      {cuentas.length === 0 && !showForm ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏦</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Sin cuentas registradas</div>
          <div style={{ fontSize: 12, marginBottom: 16, color: 'var(--gray-300)' }}>
            Agrega tus cuentas bancarias, tarjetas y más
          </div>
          <button onClick={openNew} className="btn-primary">Agregar primera cuenta</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {cuentas.map(c => (
            <TarjetaCuenta key={c.id} cuenta={c} onEdit={openEdit} onDelete={id => setConfirmDelete(id)} />
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar cuenta?"
          message="La cuenta será eliminada de tu lista. Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ─── Tarjeta visual de cuenta ─────────────────────────────────────────────────
function TarjetaCuenta({ cuenta, onEdit, onDelete }) {
  const tipoInfo = TIPOS_CUENTA.find(t => t.value === cuenta.tipo) || TIPOS_CUENTA[0]

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Franja de color superior */}
      <div style={{
        background: `linear-gradient(135deg, ${cuenta.color || '#1D9E75'} 0%, ${cuenta.color || '#1D9E75'}cc 100%)`,
        padding: '16px 18px',
        color: '#fff',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{cuenta.icono || tipoInfo.icono}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{cuenta.nombre}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              {tipoInfo.label}
              {cuenta.institucion && ` · ${cuenta.institucion}`}
            </div>
            {cuenta.numero_ultimos4 && (
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, letterSpacing: 2 }}>
                •••• •••• •••• {cuenta.numero_ultimos4}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>Saldo inicial</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{fmt(cuenta.saldo_inicial || 0)}</div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--gray-100)' }}>
        <button onClick={() => onEdit(cuenta)}
          style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            color: 'var(--gray-600)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            borderRight: '1px solid var(--gray-100)'
          }}>
          ✏️ Editar
        </button>
        <button onClick={() => onDelete(cuenta.id)}
          style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            color: '#D85A30', fontSize: 12, fontWeight: 500, cursor: 'pointer'
          }}>
          🗑 Eliminar
        </button>
      </div>
    </div>
  )
}
