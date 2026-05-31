import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmModal from './ConfirmModal'

function fmt(n) {
  const num = Number(n)
  const hasDecimals = num % 1 !== 0
  return '$' + (hasDecimals
    ? num.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : Math.round(num).toLocaleString('es-CL'))
}

export default function Deudas({ userId, onToast }) {
  const [deudas, setDeudas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [direccion, setDireccion] = useState('debo')
  const [estado, setEstado] = useState('pendiente')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [vencimiento, setVencimiento] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchDeudas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('deudas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setDeudas(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchDeudas() }, [fetchDeudas])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre || !monto || monto <= 0) {
      setError('Completa todos los campos correctamente')
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('deudas').insert([{
      user_id: userId,
      nombre_persona: nombre,
      monto: parseFloat(monto),
      direccion,
      estado,
      fecha_inicio: fecha,
      fecha_vencimiento: vencimiento || null,
      notas: notas || ''
    }])
    if (err) {
      setError(err.message)
    } else {
      setNombre(''); setMonto(''); setDireccion('debo')
      setEstado('pendiente'); setFecha(new Date().toISOString().split('T')[0])
      setNotas(''); setVencimiento(''); setShowForm(false)
      fetchDeudas()
      onToast?.('Deuda guardada correctamente')
    }
    setSaving(false)
  }

  async function handleDelete(id) { setConfirmDelete(id) }

  async function confirmDeleteAction() {
    await supabase.from('deudas').delete().eq('id', confirmDelete)
    setConfirmDelete(null)
    fetchDeudas()
    onToast?.('Deuda eliminada')
  }

  async function toggleEstado(id, currentEstado) {
    const nuevoEstado = currentEstado === 'pendiente' ? 'pagado' : 'pendiente'
    await supabase.from('deudas').update({ estado: nuevoEstado }).eq('id', id)
    fetchDeudas()
    onToast?.(nuevoEstado === 'pagado' ? '✓ Marcada como pagada' : 'Marcada como pendiente')
  }

  const resumen = useMemo(() => {
    const pend = deudas.filter(d => d.estado === 'pendiente')
    const debo = pend.filter(d => d.direccion === 'debo').reduce((s, d) => s + Number(d.monto), 0)
    const meDeben = pend.filter(d => d.direccion === 'me deben').reduce((s, d) => s + Number(d.monto), 0)
    return { debo, meDeben, total: debo + meDeben }
  }, [deudas])

  const deudasOrdenadas = useMemo(() => {
    return [...deudas].sort((a, b) => {
      if (a.estado === b.estado) return 0
      return a.estado === 'pendiente' ? -1 : 1
    })
  }, [deudas])

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Cargando deudas...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Deudas y préstamos</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '8px 16px' }}>
          {showForm ? 'Cancelar' : '+ Nueva deuda'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--coral-light)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
          <span style={{ color: '#712B13' }}>Debo: <strong>{fmt(resumen.debo)}</strong></span>
        </div>
        <div style={{ background: 'var(--teal-light)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
          <span style={{ color: 'var(--teal-dark)' }}>Me deben: <strong>{fmt(resumen.meDeben)}</strong></span>
        </div>
        <div style={{ background: 'var(--gray-100)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
          <span style={{ color: 'var(--gray-600)' }}>Total pendiente: <strong>{fmt(resumen.total)}</strong></span>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label>Tipo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['debo', 'me deben'].map(d => (
                    <button key={d} type="button" onClick={() => setDireccion(d)}
                      style={{
                        flex: 1, padding: '8px', border: '1.5px solid',
                        borderColor: direccion === d ? 'var(--teal)' : 'var(--gray-200)',
                        borderRadius: 8, background: direccion === d ? 'var(--teal-light)' : '#fff',
                        color: direccion === d ? 'var(--teal-dark)' : 'var(--gray-400)',
                        fontWeight: direccion === d ? 600 : 400, fontSize: 12, cursor: 'pointer'
                      }}>
                      {d === 'debo' ? '💸 Debo' : '💰 Me deben'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={estado} onChange={e => setEstado(e.target.value)}>
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Nombre de la persona</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Carlos, María" required />
            </div>

            <div className="form-group">
              <label>Monto (CLP)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, color: 'var(--gray-400)' }}>$</span>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
                  placeholder="0" step="0.01" min="0" required style={{ flex: 1 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Fecha inicio</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  max={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="form-group">
                <label>Vencimiento (opcional)</label>
                <input type="date" value={vencimiento} onChange={e => setVencimiento(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            <div className="form-group">
              <label>Descripción o notas (opcional)</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Ej: Dinero del almuerzo, préstamo para el auto..."
                rows="2" style={{ resize: 'vertical' }} />
            </div>

            <button type="submit" className="btn-primary" disabled={saving}
              style={{ width: '100%', padding: '10px 0' }}>
              {saving ? 'Guardando...' : 'Guardar deuda'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de deudas */}
      {deudas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div>Sin deudas registradas</div>
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ marginTop: 12 }}>
            Registrar primera deuda
          </button>
        </div>
      ) : (
        <>
          {deudasOrdenadas.filter(d => d.estado === 'pendiente').length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              Pendientes
            </div>
          )}
          {deudasOrdenadas.filter(d => d.estado === 'pendiente').map(d =>
            <DeudaCard key={d.id} d={d} onToggle={toggleEstado} onDelete={handleDelete} />
          )}
          {deudasOrdenadas.filter(d => d.estado === 'pagado').length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '16px 0 8px' }}>
              Pagadas
            </div>
          )}
          {deudasOrdenadas.filter(d => d.estado === 'pagado').map(d =>
            <DeudaCard key={d.id} d={d} onToggle={toggleEstado} onDelete={handleDelete} />
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar deuda?"
          message="Esta acción no se puede deshacer. La deuda será eliminada permanentemente."
          confirmLabel="Sí, eliminar"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

function DeudaCard({ d, onToggle, onDelete }) {
  const vencBadge = () => {
    if (!d.fecha_vencimiento || d.estado === 'pagado') return null
    const hoy = new Date()
    const vence = new Date(d.fecha_vencimiento + 'T12:00:00')
    const dias = Math.ceil((vence - hoy) / 86400000)
    if (dias < 0)  return { label: `Venció hace ${Math.abs(dias)} días`, bg: '#FCEBEB', color: '#791F1F' }
    if (dias <= 7) return { label: `Vence en ${dias} día${dias !== 1 ? 's' : ''}`, bg: '#FAEEDA', color: '#633806' }
    return { label: `Vence ${vence.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`, bg: '#F1EFE8', color: 'var(--gray-600)' }
  }
  const badge = vencBadge()

  return (
    <div className="card" style={{ marginBottom: 10, padding: '14px 16px', opacity: d.estado === 'pagado' ? 0.65 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
          background: d.direccion === 'debo' ? 'var(--coral-light)' : 'var(--teal-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
        }}>
          {d.direccion === 'debo' ? '💸' : '💰'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{d.nombre_persona}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
            {d.direccion === 'debo' ? 'Debo a' : 'Me debe'} · {new Date(d.fecha_inicio + 'T12:00:00').toLocaleDateString('es-CL')}
          </div>
          {badge && (
            <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 8, marginTop: 4, background: badge.bg, color: badge.color }}>
              ⏰ {badge.label}
            </div>
          )}
          {d.notas && (
            <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 5, padding: '6px 8px', background: 'var(--gray-100)', borderRadius: 5 }}>
              📝 {d.notas}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: d.direccion === 'debo' ? '#D85A30' : '#1D9E75' }}>
            {fmt(d.monto)}
          </div>
          <button onClick={() => onToggle(d.id, d.estado)}
            style={{
              fontSize: 11, padding: '2px 8px', border: 'none', borderRadius: 10,
              marginTop: 4, cursor: 'pointer',
              background: d.estado === 'pagado' ? '#EAF3DE' : '#FAEEDA',
              color: d.estado === 'pagado' ? '#27500A' : '#633806',
              fontWeight: 500
            }}>
            {d.estado === 'pagado' ? '✓ Pagado' : '⏳ Pendiente'}
          </button>
        </div>
        <button onClick={() => onDelete(d.id)}
          style={{ background: 'none', border: 'none', color: 'var(--gray-200)', fontSize: 18, padding: '2px 4px', cursor: 'pointer' }}
          title="Eliminar">×</button>
      </div>
    </div>
  )
}
