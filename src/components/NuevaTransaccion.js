import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIAS = [
  'Vivienda', 'Alimentación', 'Transporte', 'Salud',
  'Entretenimiento', 'Educación', 'Ropa', 'Otros'
]

export default function NuevaTransaccion({ userId, onClose, onSaved }) {
  const [tipo, setTipo] = useState('egreso')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState('Alimentación')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!monto || monto <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('transacciones').insert([{
      user_id: userId,
      fecha,
      monto: parseFloat(monto),
      tipo,
      categoria,
      descripcion
    }])

    if (err) {
      setError(err.message)
    } else {
      onSaved()
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', zIndex: 300
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 500, borderTopLeftRadius: 20,
        borderTopRightRadius: 20, background: '#fff', padding: '20px',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.1)', maxHeight: '90vh', overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>Nuevo movimiento</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20,
            color: 'var(--gray-400)', padding: '4px 8px'
          }}>×</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Tipo */}
          <div className="form-group">
            <label>Tipo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['ingreso', 'egreso'].map(t => (
                <button key={t} type="button" onClick={() => setTipo(t)}
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
                placeholder="0" step="1000" min="0" required
                style={{ flex: 1 }} />
            </div>
          </div>

          {/* Fecha */}
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              max={new Date().toISOString().split('T')[0]} required />
          </div>

          {/* Categoría */}
          <div className="form-group">
            <label>Categoría</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} required>
              {CATEGORIAS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label>Descripción (opcional)</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Compra en supermercado" rows="2"
              style={{ resize: 'vertical' }} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width: '100%', padding: '12px 0', marginTop: 8 }}>
            {loading ? 'Guardando...' : 'Guardar movimiento'}
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
