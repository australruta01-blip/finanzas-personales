import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmModal from './ConfirmModal'

const CATEGORIAS_INGRESO_DEFAULT = [
  'Sueldo', 'Bono', 'Quincena', 'Freelance', 'Venta', 'Préstamo', 'Inversión', 'Otros'
]
const CATEGORIAS_EGRESO_DEFAULT = [
  'Vivienda', 'Alimentación', 'Transporte', 'Salud',
  'Entretenimiento', 'Educación', 'Ropa', 'Servicios', 'Otros'
]

function fmt(n) {
  const num = Number(n) || 0
  const hasDecimals = num % 1 !== 0
  return '$' + (hasDecimals
    ? num.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : Math.round(num).toLocaleString('es-CL'))
}

export default function Recurrentes({ userId, onToast }) {
  const [reglas, setReglas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [categoriasCustomIngreso, setCategoriasCustomIngreso] = useState([])
  const [categoriasCustomEgreso, setCategoriasCustomEgreso] = useState([])

  // Form
  const [tipo, setTipo] = useState('egreso')
  const [categoria, setCategoria] = useState('Vivienda')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [diaMes, setDiaMes] = useState('1')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const categoriasIngreso = [...new Set([...CATEGORIAS_INGRESO_DEFAULT, ...categoriasCustomIngreso])]
  const categoriasEgreso = [...new Set([...CATEGORIAS_EGRESO_DEFAULT, ...categoriasCustomEgreso])]
  const categoriasActuales = tipo === 'ingreso' ? categoriasIngreso : categoriasEgreso

  // ─── Fetch ────────────────────────────────────────────────
  const fetchReglas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('recurrentes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    setReglas(data || [])
    setLoading(false)
  }, [userId])

  const fetchCategorias = useCallback(async () => {
    const { data } = await supabase
      .from('categorias_custom')
      .select('nombre, tipo')
      .eq('user_id', userId)
      .in('tipo', ['ingreso', 'egreso'])
    setCategoriasCustomIngreso(data?.filter(c => c.tipo === 'ingreso').map(c => c.nombre) || [])
    setCategoriasCustomEgreso(data?.filter(c => c.tipo === 'egreso').map(c => c.nombre) || [])
  }, [userId])

  useEffect(() => { fetchReglas() }, [fetchReglas])
  useEffect(() => { fetchCategorias() }, [fetchCategorias])

  // ─── Form helpers ─────────────────────────────────────────
  function openNew() {
    setEditando(null)
    setTipo('egreso'); setCategoria('Vivienda'); setMonto(''); setDescripcion(''); setDiaMes('1')
    setError('')
    setShowForm(true)
  }

  function openEdit(r) {
    setEditando(r)
    setTipo(r.tipo); setCategoria(r.categoria); setMonto(String(r.monto))
    setDescripcion(r.descripcion || ''); setDiaMes(String(r.dia_mes))
    setError('')
    setShowForm(true)
  }

  function handleTipoChange(t) {
    setTipo(t)
    setCategoria(t === 'ingreso' ? 'Sueldo' : 'Vivienda')
  }

  // ─── Submit ───────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!monto || monto <= 0) { setError('Ingresa un monto válido'); return }
    const dia = parseInt(diaMes)
    if (!dia || dia < 1 || dia > 28) { setError('El día debe ser entre 1 y 28'); return }
    setSaving(true); setError('')
    const payload = {
      user_id: userId, tipo, categoria, monto: parseFloat(monto),
      descripcion: descripcion.trim(), dia_mes: dia
    }
    try {
      if (editando?.id) {
        const { error: err } = await supabase.from('recurrentes').update(payload).eq('id', editando.id).eq('user_id', userId)
        if (err) throw err
        onToast?.('Recurrente actualizado ✓')
      } else {
        const { error: err } = await supabase.from('recurrentes').insert([payload])
        if (err) throw err
        onToast?.('Recurrente creado ✓')
      }
      setShowForm(false)
      fetchReglas()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function toggleActiva(r) {
    await supabase.from('recurrentes').update({ activa: !r.activa }).eq('id', r.id).eq('user_id', userId)
    fetchReglas()
    onToast?.(r.activa ? 'Recurrente pausado' : 'Recurrente activado')
  }

  async function confirmDeleteAction() {
    await supabase.from('recurrentes').delete().eq('id', confirmDelete).eq('user_id', userId)
    setConfirmDelete(null)
    fetchReglas()
    onToast?.('Recurrente eliminado')
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Cargando recurrentes...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Movimientos recurrentes</h2>
        <button onClick={openNew} className="btn-primary" style={{ padding: '8px 16px' }}>+ Nuevo</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 16 }}>
        Cada vez que abras la app, se generan automáticamente los movimientos del mes cuyo día ya pasó.
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
            {editando ? 'Editar recurrente' : 'Nuevo recurrente'}
          </div>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tipo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['ingreso', 'egreso'].map(t => (
                  <button key={t} type="button" onClick={() => handleTipoChange(t)}
                    style={{
                      flex: 1, padding: '10px', border: '1.5px solid',
                      borderColor: tipo === t ? 'var(--teal)' : 'var(--gray-200)',
                      borderRadius: 8, background: tipo === t ? 'var(--teal-light)' : '#fff',
                      color: tipo === t ? 'var(--teal-dark)' : 'var(--gray-400)',
                      fontWeight: tipo === t ? 600 : 400, fontSize: 13, cursor: 'pointer'
                    }}>
                    {t === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Monto (CLP)</label>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
                  placeholder="0" step="0.01" min="0" required />
              </div>
              <div className="form-group">
                <label>Día del mes</label>
                <input type="number" value={diaMes} onChange={e => setDiaMes(e.target.value)}
                  min="1" max="28" required />
              </div>
            </div>

            <div className="form-group">
              <label>Categoría</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} required>
                {categoriasActuales.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Descripción (opcional)</label>
              <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Ej: Arriendo departamento" />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1, padding: '10px 0' }}>
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear recurrente'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost" style={{ flex: 1, padding: '10px 0' }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {reglas.length === 0 && !showForm ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔁</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Sin movimientos recurrentes</div>
          <div style={{ fontSize: 12, marginBottom: 16, color: 'var(--gray-300)' }}>
            Agrega tu sueldo, arriendo o suscripciones para no cargarlos cada mes
          </div>
          <button onClick={openNew} className="btn-primary">Agregar el primero</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {reglas.map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              borderBottom: i < reglas.length - 1 ? '1px solid var(--gray-100)' : 'none',
              opacity: r.activa ? 1 : 0.5
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: r.tipo === 'ingreso' ? 'var(--teal-light)' : 'var(--coral-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15
              }}>
                {r.tipo === 'ingreso' ? '↑' : '↓'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.descripcion || r.categoria}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>
                  {r.categoria} · Día {r.dia_mes} de cada mes {!r.activa && '· Pausado'}
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: r.tipo === 'ingreso' ? '#1D9E75' : '#D85A30' }}>
                {r.tipo === 'ingreso' ? '+' : '-'}{fmt(r.monto)}
              </div>
              <button onClick={() => toggleActiva(r)}
                style={{ background: 'none', border: 'none', fontSize: 15, padding: '4px 6px', cursor: 'pointer' }}
                title={r.activa ? 'Pausar' : 'Activar'}>
                {r.activa ? '⏸' : '▶️'}
              </button>
              <button onClick={() => openEdit(r)}
                style={{ background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: 13, padding: '4px 6px', cursor: 'pointer' }}
                title="Editar">✏️</button>
              <button onClick={() => setConfirmDelete(r.id)}
                style={{ background: 'none', border: 'none', color: 'var(--gray-200)', fontSize: 16, padding: '4px 6px', cursor: 'pointer' }}
                title="Eliminar">×</button>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar recurrente?"
          message="Dejará de generarse este movimiento cada mes. Los movimientos ya generados no se eliminan."
          confirmLabel="Sí, eliminar"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
