import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIAS_INGRESO_DEFAULT = [
  'Sueldo', 'Bono', 'Quincena', 'Freelance', 'Venta', 'Préstamo', 'Inversión', 'Otros'
]
const CATEGORIAS_EGRESO_DEFAULT = [
  'Vivienda', 'Alimentación', 'Transporte', 'Salud',
  'Entretenimiento', 'Educación', 'Ropa', 'Servicios', 'Otros'
]

export default function NuevaTransaccion({ userId, onClose, onSaved, transaccionEditar = null }) {
  const tipoInicial = transaccionEditar?.tipo || 'egreso'

  const [tipo, setTipo] = useState(tipoInicial)
  const [fecha, setFecha] = useState(transaccionEditar?.fecha || new Date().toISOString().split('T')[0])
  const [monto, setMonto] = useState(transaccionEditar?.monto || '')
  const [descripcion, setDescripcion] = useState(transaccionEditar?.descripcion || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Categorías
  const [categoriasCustomIngreso, setCategoriasCustomIngreso] = useState([])
  const [categoriasCustomEgreso, setCategoriasCustomEgreso] = useState([])
  const [showNuevaCat, setShowNuevaCat] = useState(false)
  const [nuevaCat, setNuevaCat] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  const categoriasIngreso = [...new Set([...CATEGORIAS_INGRESO_DEFAULT, ...categoriasCustomIngreso])]
  const categoriasEgreso = [...new Set([...CATEGORIAS_EGRESO_DEFAULT, ...categoriasCustomEgreso])]
  const categoriasActuales = tipo === 'ingreso' ? categoriasIngreso : categoriasEgreso

  // Calcular categoría inicial (con normalización para edición)
  function getCategoriaNormalizada(catEdit, tipoEdit) {
    const cats = tipoEdit === 'ingreso' ? CATEGORIAS_INGRESO_DEFAULT : CATEGORIAS_EGRESO_DEFAULT
    if (!catEdit) return tipoEdit === 'ingreso' ? 'Sueldo' : 'Alimentación'
    return cats.includes(catEdit) ? catEdit : 'Otros'
  }

  const [categoria, setCategoria] = useState(
    getCategoriaNormalizada(transaccionEditar?.categoria, tipoInicial)
  )

  // ─── Fetch categorías custom ──────────────────────────────
  const fetchCategorias = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('categorias_custom')
      .select('nombre, tipo')
      .eq('user_id', userId)
      .in('tipo', ['ingreso', 'egreso'])
      .order('created_at', { ascending: true })
    setCategoriasCustomIngreso(data?.filter(c => c.tipo === 'ingreso').map(c => c.nombre) || [])
    setCategoriasCustomEgreso(data?.filter(c => c.tipo === 'egreso').map(c => c.nombre) || [])
  }, [userId])

  useEffect(() => { fetchCategorias() }, [fetchCategorias])

  // Si la categoría editada es custom, asegurar que esté disponible
  useEffect(() => {
    if (transaccionEditar?.categoria) {
      const cats = tipo === 'ingreso' ? categoriasIngreso : categoriasEgreso
      if (cats.includes(transaccionEditar.categoria)) {
        setCategoria(transaccionEditar.categoria)
      }
    }
  }, [categoriasCustomIngreso, categoriasCustomEgreso]) // eslint-disable-line

  // ─── Agregar categoría custom ─────────────────────────────
  async function agregarCategoria() {
    const nombre = nuevaCat.trim()
    if (!nombre) return
    const allCats = tipo === 'ingreso' ? categoriasIngreso : categoriasEgreso
    if (allCats.includes(nombre)) {
      setCategoria(nombre)
      setNuevaCat('')
      setShowNuevaCat(false)
      return
    }
    setSavingCat(true)
    await supabase.from('categorias_custom').insert([{ user_id: userId, nombre, tipo }])
    await fetchCategorias()
    setCategoria(nombre)
    setNuevaCat('')
    setShowNuevaCat(false)
    setSavingCat(false)
  }

  // ─── Cambiar tipo ─────────────────────────────────────────
  function handleTipoChange(t) {
    setTipo(t)
    setCategoria(t === 'ingreso' ? 'Sueldo' : 'Alimentación')
    setShowNuevaCat(false)
    setNuevaCat('')
  }

  // ─── Submit ───────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!monto || monto <= 0) { setError('Ingresa un monto válido'); return }
    setLoading(true)
    setError('')
    try {
      if (transaccionEditar?.id) {
        const { error: err } = await supabase
          .from('transacciones')
          .update({ fecha, monto: parseFloat(monto), tipo, categoria, descripcion })
          .eq('id', transaccionEditar.id)
          .eq('user_id', userId)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('transacciones').insert([{
          user_id: userId, fecha, monto: parseFloat(monto), tipo, categoria, descripcion
        }])
        if (err) throw err
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 480, borderTopLeftRadius: 20,
        borderTopRightRadius: 20, background: '#fff', padding: '20px',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.1)', maxHeight: '92vh', overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>
            {transaccionEditar ? 'Editar movimiento' : 'Nuevo movimiento'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--gray-400)', padding: '4px 8px', cursor: 'pointer' }}>×</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Tipo */}
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

          {/* Monto */}
          <div className="form-group">
            <label>Monto (CLP)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, color: 'var(--gray-400)' }}>$</span>
              <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
                placeholder="0" step="0.01" min="0" required style={{ flex: 1 }} />
            </div>
          </div>

          {/* Fecha */}
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              max={new Date().toISOString().split('T')[0]} required />
          </div>

          {/* Categoría con opción custom */}
          <div className="form-group">
            <label>Categoría</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} required style={{ flex: 1 }}>
                {categoriasActuales.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" onClick={() => setShowNuevaCat(v => !v)}
                style={{
                  padding: '8px 10px', border: '1px solid var(--gray-200)', borderRadius: 8,
                  background: showNuevaCat ? 'var(--teal-light)' : '#fff', cursor: 'pointer',
                  fontSize: 12, color: 'var(--teal-dark)', fontWeight: 600
                }}>
                + Nueva
              </button>
            </div>
            {showNuevaCat && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input type="text" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
                  placeholder="Nueva categoría..." style={{ flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarCategoria())} />
                <button type="button" onClick={agregarCategoria} className="btn-primary"
                  style={{ padding: '6px 12px' }} disabled={savingCat}>
                  {savingCat ? '...' : 'Añadir'}
                </button>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label>Descripción (opcional)</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Compra en supermercado" rows="2" style={{ resize: 'vertical' }} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width: '100%', padding: '12px 0', marginTop: 8 }}>
            {loading ? 'Guardando...' : transaccionEditar ? 'Actualizar movimiento' : 'Guardar movimiento'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost"
            style={{ width: '100%', padding: '12px 0', marginTop: 8 }}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}
