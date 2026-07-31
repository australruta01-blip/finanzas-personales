import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmModal from './ConfirmModal'

function fmt(n) {
  const num = Number(n) || 0
  const hasDecimals = num % 1 !== 0
  return '$' + (hasDecimals
    ? num.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : Math.round(num).toLocaleString('es-CL'))
}

const COLORES = ['#1D9E75','#D85A30','#BA7517','#378ADD','#7F77DD','#D4537E','#5BB5C8','#888780']
const ICONOS = ['🎯','🏖️','🚗','🏠','💻','🎓','👶','💍','⚕️','🎁','📱','✈️']

export default function Metas({ userId, onToast }) {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [aportandoId, setAportandoId] = useState(null)
  const [montoAporte, setMontoAporte] = useState('')

  // Form
  const [nombre, setNombre] = useState('')
  const [montoObjetivo, setMontoObjetivo] = useState('')
  const [fechaObjetivo, setFechaObjetivo] = useState('')
  const [icono, setIcono] = useState('🎯')
  const [color, setColor] = useState('#1D9E75')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // ─── Fetch ────────────────────────────────────────────────
  const fetchMetas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('metas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    setMetas(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchMetas() }, [fetchMetas])

  // ─── Form helpers ─────────────────────────────────────────
  function openNew() {
    setEditando(null)
    setNombre(''); setMontoObjetivo(''); setFechaObjetivo(''); setIcono('🎯'); setColor('#1D9E75')
    setError('')
    setShowForm(true)
  }

  function openEdit(m) {
    setEditando(m)
    setNombre(m.nombre); setMontoObjetivo(String(m.monto_objetivo))
    setFechaObjetivo(m.fecha_objetivo || ''); setIcono(m.icono || '🎯'); setColor(m.color || '#1D9E75')
    setError('')
    setShowForm(true)
  }

  // ─── Submit ───────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    if (!montoObjetivo || montoObjetivo <= 0) { setError('Ingresa un monto objetivo válido'); return }
    setSaving(true); setError('')
    const payload = {
      user_id: userId,
      nombre: nombre.trim(),
      monto_objetivo: parseFloat(montoObjetivo),
      fecha_objetivo: fechaObjetivo || null,
      icono, color
    }
    try {
      if (editando?.id) {
        const { error: err } = await supabase.from('metas').update(payload).eq('id', editando.id).eq('user_id', userId)
        if (err) throw err
        onToast?.('Meta actualizada ✓')
      } else {
        const { error: err } = await supabase.from('metas').insert([{ ...payload, monto_actual: 0, estado: 'activa' }])
        if (err) throw err
        onToast?.('Meta creada ✓')
      }
      setShowForm(false)
      fetchMetas()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  // ─── Aportar ──────────────────────────────────────────────
  async function confirmarAporte(meta) {
    const val = parseFloat(montoAporte)
    if (!val || val <= 0) { setAportandoId(null); setMontoAporte(''); return }
    const nuevoMonto = Number(meta.monto_actual) + val
    const completada = nuevoMonto >= Number(meta.monto_objetivo)
    await supabase.from('metas')
      .update({ monto_actual: nuevoMonto, estado: completada ? 'completada' : 'activa' })
      .eq('id', meta.id).eq('user_id', userId)
    setAportandoId(null)
    setMontoAporte('')
    fetchMetas()
    onToast?.(completada ? `¡Meta "${meta.nombre}" cumplida! 🎉` : 'Aporte registrado ✓')
  }

  // ─── Eliminar ─────────────────────────────────────────────
  async function confirmDeleteAction() {
    await supabase.from('metas').delete().eq('id', confirmDelete).eq('user_id', userId)
    setConfirmDelete(null)
    fetchMetas()
    onToast?.('Meta eliminada')
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Cargando metas...</div>

  const activas = metas.filter(m => m.estado === 'activa')
  const completadas = metas.filter(m => m.estado === 'completada')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Metas de ahorro</h2>
        <button onClick={openNew} className="btn-primary" style={{ padding: '8px 16px' }}>+ Nueva meta</button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
            {editando ? 'Editar meta' : 'Nueva meta'}
          </div>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nombre de la meta</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Vacaciones, Pie departamento" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Monto objetivo (CLP)</label>
                <input type="number" value={montoObjetivo} onChange={e => setMontoObjetivo(e.target.value)}
                  placeholder="0" step="0.01" min="0" required />
              </div>
              <div className="form-group">
                <label>Fecha objetivo (opcional)</label>
                <input type="date" value={fechaObjetivo} onChange={e => setFechaObjetivo(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Color</label>
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
                        width: 30, height: 30, borderRadius: 6, fontSize: 15, border: '1.5px solid',
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
              <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1, padding: '10px 0' }}>
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear meta'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost" style={{ flex: 1, padding: '10px 0' }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {metas.length === 0 && !showForm ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Sin metas de ahorro</div>
          <div style={{ fontSize: 12, marginBottom: 16, color: 'var(--gray-300)' }}>
            Define algo que quieras lograr y ve tu progreso mes a mes
          </div>
          <button onClick={openNew} className="btn-primary">Crear mi primera meta</button>
        </div>
      ) : (
        <>
          {activas.length > 0 && (
            <div style={{ display: 'grid', gap: 12, marginBottom: completadas.length > 0 ? 20 : 0 }}>
              {activas.map(m => (
                <TarjetaMeta key={m.id} meta={m}
                  aportando={aportandoId === m.id} montoAporte={montoAporte}
                  onMontoAporte={setMontoAporte}
                  onIniciarAporte={() => { setAportandoId(m.id); setMontoAporte('') }}
                  onCancelarAporte={() => { setAportandoId(null); setMontoAporte('') }}
                  onConfirmarAporte={() => confirmarAporte(m)}
                  onEdit={openEdit} onDelete={id => setConfirmDelete(id)} />
              ))}
            </div>
          )}

          {completadas.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase',
                letterSpacing: '.06em', marginBottom: 8 }}>Completadas 🎉</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {completadas.map(m => (
                  <TarjetaMeta key={m.id} meta={m} completada
                    onEdit={openEdit} onDelete={id => setConfirmDelete(id)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar meta?"
          message="La meta será eliminada. Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ─── Tarjeta visual de meta ────────────────────────────────────────────────
function TarjetaMeta({
  meta, completada, aportando, montoAporte, onMontoAporte,
  onIniciarAporte, onCancelarAporte, onConfirmarAporte, onEdit, onDelete
}) {
  const pct = Math.min(100, Math.round((Number(meta.monto_actual) / Number(meta.monto_objetivo)) * 100))
  const diasRestantes = meta.fecha_objetivo
    ? Math.ceil((new Date(meta.fecha_objetivo + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="card" style={{ padding: 16, opacity: completada ? 0.85 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0, fontSize: 18,
            background: `${meta.color || '#1D9E75'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {meta.icono || '🎯'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {meta.nombre}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
              {completada ? '✓ Completada' : diasRestantes !== null
                ? (diasRestantes >= 0 ? `${diasRestantes} días restantes` : 'Fecha vencida')
                : 'Sin fecha límite'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onEdit(meta)}
            style={{ background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: 13, padding: '4px 6px', cursor: 'pointer' }}
            title="Editar">✏️</button>
          <button onClick={() => onDelete(meta.id)}
            style={{ background: 'none', border: 'none', color: 'var(--gray-200)', fontSize: 16, padding: '4px 6px', cursor: 'pointer' }}
            title="Eliminar">×</button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div style={{ background: 'var(--gray-100)', borderRadius: 8, height: 10, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 8,
          background: meta.color || '#1D9E75', transition: 'width .3s'
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
        <span style={{ color: 'var(--gray-600)' }}>
          <strong>{fmt(meta.monto_actual)}</strong> de {fmt(meta.monto_objetivo)}
        </span>
        <span style={{ fontWeight: 600, color: meta.color || '#1D9E75' }}>{pct}%</span>
      </div>

      {!completada && (
        aportando ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input type="number" autoFocus value={montoAporte} onChange={e => onMontoAporte(e.target.value)}
              placeholder="Monto a aportar" min="0" step="0.01" style={{ flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && onConfirmarAporte()} />
            <button onClick={onConfirmarAporte} className="btn-primary" style={{ padding: '6px 14px' }}>Añadir</button>
            <button onClick={onCancelarAporte} className="btn-ghost" style={{ padding: '6px 12px' }}>Cancelar</button>
          </div>
        ) : (
          <button onClick={onIniciarAporte} className="btn-ghost" style={{ width: '100%', marginTop: 10, padding: '8px 0', fontSize: 12 }}>
            + Aportar
          </button>
        )
      )}
    </div>
  )
}
