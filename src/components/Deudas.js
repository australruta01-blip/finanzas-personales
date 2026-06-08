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

const CATEGORIAS_DEUDA_DEFAULT = ['Préstamo personal', 'Alimentación', 'Transporte', 'Servicios', 'Arriendo', 'Otros']

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
  const [categoriaDeuda, setCategoriaDeuda] = useState('Otros')
  const [categoriasCustom, setCategoriasCustom] = useState([])
  const [nuevaCat, setNuevaCat] = useState('')
  const [showNuevaCat, setShowNuevaCat] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [pagoModal, setPagoModal] = useState(null)   // deuda seleccionada para pagar
  const [historialModal, setHistorialModal] = useState(null) // deuda para ver historial

  // ─── Fetch ────────────────────────────────────────────────
  const fetchDeudas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('deudas')
      .select('*, pagos_deuda(id, monto, fecha, nota, created_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setDeudas(data || [])
    setLoading(false)
  }, [userId])

  const fetchCategorias = useCallback(async () => {
    const { data } = await supabase
      .from('categorias_custom')
      .select('nombre')
      .eq('user_id', userId)
      .eq('tipo', 'deuda')
      .order('created_at', { ascending: true })
    setCategoriasCustom(data?.map(c => c.nombre) || [])
  }, [userId])

  useEffect(() => { fetchDeudas(); fetchCategorias() }, [fetchDeudas, fetchCategorias])

  const todasCategorias = useMemo(
    () => [...new Set([...CATEGORIAS_DEUDA_DEFAULT, ...categoriasCustom])],
    [categoriasCustom]
  )

  // ─── Agregar categoría custom ─────────────────────────────
  async function agregarCategoria() {
    const nombre = nuevaCat.trim()
    if (!nombre) return
    if (todasCategorias.includes(nombre)) {
      setCategoriaDeuda(nombre)
      setNuevaCat('')
      setShowNuevaCat(false)
      return
    }
    await supabase.from('categorias_custom').insert([{ user_id: userId, nombre, tipo: 'deuda' }])
    await fetchCategorias()
    setCategoriaDeuda(nombre)
    setNuevaCat('')
    setShowNuevaCat(false)
  }

  // ─── Submit nueva deuda ───────────────────────────────────
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
      notas: `[${categoriaDeuda}] ${notas}`.trim()
    }])
    if (err) {
      setError(err.message)
    } else {
      resetForm()
      setShowForm(false)
      fetchDeudas()
      onToast?.('Deuda guardada correctamente')
    }
    setSaving(false)
  }

  function resetForm() {
    setNombre(''); setMonto(''); setDireccion('debo')
    setEstado('pendiente'); setFecha(new Date().toISOString().split('T')[0])
    setNotas(''); setVencimiento(''); setCategoriaDeuda('Otros'); setError('')
  }

  // ─── Eliminar deuda ───────────────────────────────────────
  async function confirmDeleteAction() {
    await supabase.from('deudas').delete().eq('id', confirmDelete)
    setConfirmDelete(null)
    fetchDeudas()
    onToast?.('Deuda eliminada')
  }

  // ─── Toggle estado ────────────────────────────────────────
  async function toggleEstado(id, currentEstado) {
    const nuevoEstado = currentEstado === 'pendiente' ? 'pagado' : 'pendiente'
    await supabase.from('deudas').update({ estado: nuevoEstado }).eq('id', id)
    fetchDeudas()
    onToast?.(nuevoEstado === 'pagado' ? '✓ Marcada como pagada' : 'Marcada como pendiente')
  }

  // ─── Resumen ──────────────────────────────────────────────
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Deudas y préstamos</h2>
        <button onClick={() => { setShowForm(!showForm); resetForm() }} className="btn-primary" style={{ padding: '8px 16px' }}>
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

      {/* Formulario nueva deuda */}
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

            {/* Categoría custom */}
            <div className="form-group">
              <label>Categoría</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={categoriaDeuda} onChange={e => setCategoriaDeuda(e.target.value)} style={{ flex: 1 }}>
                  {todasCategorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" onClick={() => setShowNuevaCat(v => !v)}
                  style={{ padding: '8px 10px', border: '1px solid var(--gray-200)', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 12, color: 'var(--teal-dark)', fontWeight: 600 }}>
                  + Nueva
                </button>
              </div>
              {showNuevaCat && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input type="text" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
                    placeholder="Nombre de categoría..." style={{ flex: 1 }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarCategoria())} />
                  <button type="button" onClick={agregarCategoria} className="btn-primary" style={{ padding: '6px 12px' }}>Añadir</button>
                </div>
              )}
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
                <input type="date" value={vencimiento} onChange={e => setVencimiento(e.target.value)} />
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

      {/* Lista */}
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
            <DeudaCard key={d.id} d={d}
              onToggle={toggleEstado}
              onDelete={id => setConfirmDelete(id)}
              onPago={d => setPagoModal(d)}
              onHistorial={d => setHistorialModal(d)}
            />
          )}
          {deudasOrdenadas.filter(d => d.estado === 'pagado').length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '16px 0 8px' }}>
              Pagadas
            </div>
          )}
          {deudasOrdenadas.filter(d => d.estado === 'pagado').map(d =>
            <DeudaCard key={d.id} d={d}
              onToggle={toggleEstado}
              onDelete={id => setConfirmDelete(id)}
              onPago={d => setPagoModal(d)}
              onHistorial={d => setHistorialModal(d)}
            />
          )}
        </>
      )}

      {/* Modal pago parcial */}
      {pagoModal && (
        <PagoParciálModal
          deuda={pagoModal}
          userId={userId}
          onClose={() => setPagoModal(null)}
          onSaved={() => { setPagoModal(null); fetchDeudas(); onToast?.('Pago registrado ✓') }}
        />
      )}

      {/* Modal historial */}
      {historialModal && (
        <HistorialPagosModal
          deuda={historialModal}
          userId={userId}
          onClose={() => setHistorialModal(null)}
          onDeleted={() => { fetchDeudas() }}
          onToast={onToast}
        />
      )}

      {/* Confirmar eliminar */}
      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar deuda?"
          message="Esta acción no se puede deshacer. La deuda y todos sus pagos serán eliminados."
          confirmLabel="Sí, eliminar"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ─── Tarjeta de deuda ─────────────────────────────────────────────────────────
function DeudaCard({ d, onToggle, onDelete, onPago, onHistorial }) {
  const pagos = d.pagos_deuda || []
  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const montoOriginal = Number(d.monto)
  const pendiente = Math.max(0, montoOriginal - totalPagado)
  const porcentaje = montoOriginal > 0 ? Math.min(100, (totalPagado / montoOriginal) * 100) : 0

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

  // Extraer categoría de notas "[Categoría] texto"
  const catMatch = d.notas?.match(/^\[([^\]]+)\]/)
  const catLabel = catMatch ? catMatch[1] : null
  const notaLimpia = d.notas?.replace(/^\[[^\]]+\]\s*/, '') || ''

  return (
    <div className="card" style={{ marginBottom: 10, padding: '14px 16px', opacity: d.estado === 'pagado' ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
          background: d.direccion === 'debo' ? 'var(--coral-light)' : 'var(--teal-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
        }}>
          {d.direccion === 'debo' ? '💸' : '💰'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500, fontSize: 13 }}>{d.nombre_persona}</span>
            {catLabel && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)', fontWeight: 500 }}>
                {catLabel}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
            {d.direccion === 'debo' ? 'Debo a' : 'Me debe'} · {new Date(d.fecha_inicio + 'T12:00:00').toLocaleDateString('es-CL')}
          </div>

          {badge && (
            <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 8, marginTop: 4, background: badge.bg, color: badge.color }}>
              ⏰ {badge.label}
            </div>
          )}

          {notaLimpia && (
            <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 5, padding: '6px 8px', background: 'var(--gray-100)', borderRadius: 5 }}>
              📝 {notaLimpia}
            </div>
          )}

          {/* Barra de progreso de pagos */}
          {pagos.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--gray-400)', marginBottom: 3 }}>
                <span>Pagado: {fmt(totalPagado)}</span>
                <span>Pendiente: {fmt(pendiente)}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--gray-200)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: porcentaje >= 100 ? '#1D9E75' : '#BA7517',
                  width: `${porcentaje}%`, transition: 'width .3s'
                }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>
                {pagos.length} pago{pagos.length !== 1 ? 's' : ''} · {Math.round(porcentaje)}%
              </div>
            </div>
          )}

          {/* Acciones */}
          {d.estado === 'pendiente' && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={() => onPago(d)}
                style={{
                  fontSize: 11, padding: '3px 10px', border: '1px solid var(--teal)',
                  borderRadius: 8, background: 'var(--teal-light)', color: 'var(--teal-dark)',
                  fontWeight: 500, cursor: 'pointer'
                }}>
                + Registrar pago
              </button>
              {pagos.length > 0 && (
                <button onClick={() => onHistorial(d)}
                  style={{
                    fontSize: 11, padding: '3px 10px', border: '1px solid var(--gray-200)',
                    borderRadius: 8, background: '#fff', color: 'var(--gray-600)',
                    fontWeight: 500, cursor: 'pointer'
                  }}>
                  Ver historial ({pagos.length})
                </button>
              )}
            </div>
          )}
          {d.estado === 'pagado' && pagos.length > 0 && (
            <button onClick={() => onHistorial(d)}
              style={{
                fontSize: 11, padding: '3px 10px', border: '1px solid var(--gray-200)',
                borderRadius: 8, background: '#fff', color: 'var(--gray-600)',
                fontWeight: 500, cursor: 'pointer', marginTop: 8
              }}>
              Ver historial ({pagos.length})
            </button>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: d.direccion === 'debo' ? '#D85A30' : '#1D9E75' }}>
            {fmt(d.monto)}
          </div>
          {pagos.length > 0 && pendiente > 0 && d.estado === 'pendiente' && (
            <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 1 }}>
              Resta {fmt(pendiente)}
            </div>
          )}
          <button onClick={() => onToggle(d.id, d.estado)}
            style={{
              fontSize: 11, padding: '2px 8px', border: 'none', borderRadius: 10,
              marginTop: 4, cursor: 'pointer',
              background: d.estado === 'pagado' ? '#EAF3DE' : '#FAEEDA',
              color: d.estado === 'pagado' ? '#27500A' : '#633806', fontWeight: 500
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

// ─── Modal: registrar pago parcial ────────────────────────────────────────────
function PagoParciálModal({ deuda, userId, onClose, onSaved }) {
  const pagosExistentes = deuda.pagos_deuda || []
  const totalPagado = pagosExistentes.reduce((s, p) => s + Number(p.monto), 0)
  const pendiente = Math.max(0, Number(deuda.monto) - totalPagado)

  const [montoPago, setMontoPago] = useState('')
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [notaPago, setNotaPago] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const m = parseFloat(montoPago)
    if (!m || m <= 0) { setError('Ingresa un monto válido'); return }
    if (m > pendiente + 0.01) { setError(`El pago supera el saldo pendiente (${fmt(pendiente)})`); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('pagos_deuda').insert([{
      deuda_id: deuda.id,
      user_id: userId,
      monto: m,
      fecha: fechaPago,
      nota: notaPago
    }])
    if (err) { setError(err.message); setSaving(false); return }

    // Si el pago cubre el total, marcar como pagado automáticamente
    const nuevoTotal = totalPagado + m
    if (nuevoTotal >= Number(deuda.monto) - 0.01) {
      await supabase.from('deudas').update({ estado: 'pagado' }).eq('id', deuda.id)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 400 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 480, borderTopLeftRadius: 20, borderTopRightRadius: 20, background: '#fff', padding: 20, boxShadow: '0 -4px 16px rgba(0,0,0,0.1)', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Registrar pago</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--gray-400)', cursor: 'pointer' }}>×</button>
        </div>

        {/* Resumen de la deuda */}
        <div style={{ background: 'var(--gray-100)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{deuda.nombre_persona}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray-600)' }}>
            <span>Monto total: <strong>{fmt(deuda.monto)}</strong></span>
            <span>Ya pagado: <strong style={{ color: '#1D9E75' }}>{fmt(totalPagado)}</strong></span>
            <span>Pendiente: <strong style={{ color: '#D85A30' }}>{fmt(pendiente)}</strong></span>
          </div>
          <div style={{ marginTop: 8, height: 5, borderRadius: 3, background: 'var(--gray-200)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: '#BA7517', width: `${Math.min(100, (totalPagado / Number(deuda.monto)) * 100)}%` }} />
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Monto del pago (CLP)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, color: 'var(--gray-400)' }}>$</span>
              <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)}
                placeholder={`Máx. ${fmt(pendiente)}`} step="0.01" min="0" required style={{ flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {[25, 50, 75, 100].map(pct => (
                <button key={pct} type="button"
                  onClick={() => setMontoPago((pendiente * pct / 100).toFixed(0))}
                  style={{ flex: 1, padding: '4px 0', fontSize: 11, border: '1px solid var(--gray-200)', borderRadius: 6, background: '#fff', cursor: 'pointer', color: 'var(--gray-600)' }}>
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Fecha del pago</label>
            <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
              max={new Date().toISOString().split('T')[0]} required />
          </div>

          <div className="form-group">
            <label>Nota (opcional)</label>
            <input type="text" value={notaPago} onChange={e => setNotaPago(e.target.value)}
              placeholder="Ej: Transferencia bancaria, efectivo..." />
          </div>

          <button type="submit" className="btn-primary" disabled={saving}
            style={{ width: '100%', padding: '11px 0' }}>
            {saving ? 'Guardando...' : 'Registrar pago'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: historial de pagos ────────────────────────────────────────────────
function HistorialPagosModal({ deuda, userId, onClose, onDeleted, onToast }) {
  const [pagos, setPagos] = useState(deuda.pagos_deuda || [])
  const [confirmDel, setConfirmDel] = useState(null)

  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const porcentaje = Number(deuda.monto) > 0 ? Math.min(100, (totalPagado / Number(deuda.monto)) * 100) : 0

  async function deletePago(id) {
    await supabase.from('pagos_deuda').delete().eq('id', id)
    setPagos(prev => prev.filter(p => p.id !== id))
    onDeleted()
    onToast?.('Pago eliminado')
    setConfirmDel(null)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 400 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 480, borderTopLeftRadius: 20, borderTopRightRadius: 20, background: '#fff', padding: 20, boxShadow: '0 -4px 16px rgba(0,0,0,0.1)', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Historial de pagos</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--gray-400)', cursor: 'pointer' }}>×</button>
        </div>

        {/* Resumen */}
        <div style={{ background: 'var(--gray-100)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{deuda.nombre_persona} — {fmt(deuda.monto)}</div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--gray-200)', overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', borderRadius: 3, background: porcentaje >= 100 ? '#1D9E75' : '#BA7517', width: `${porcentaje}%`, transition: 'width .3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray-600)' }}>
            <span>Pagado: <strong style={{ color: '#1D9E75' }}>{fmt(totalPagado)}</strong></span>
            <span>{Math.round(porcentaje)}% completado</span>
            <span>Resta: <strong style={{ color: '#D85A30' }}>{fmt(Math.max(0, Number(deuda.monto) - totalPagado))}</strong></span>
          </div>
        </div>

        {/* Lista de pagos */}
        {pagos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-400)', fontSize: 13 }}>
            Sin pagos registrados
          </div>
        ) : (
          <div>
            {[...pagos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                borderBottom: i < pagos.length - 1 ? '1px solid var(--gray-100)' : 'none'
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0
                }}>✓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1D9E75' }}>{fmt(p.monto)}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                    {new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-CL')}
                    {p.nota && <span> · {p.nota}</span>}
                  </div>
                </div>
                <button onClick={() => setConfirmDel(p.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--gray-200)', fontSize: 16, cursor: 'pointer', padding: '4px' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDel && (
        <ConfirmModal
          title="¿Eliminar este pago?"
          message="Se eliminará el registro de este pago del historial."
          confirmLabel="Eliminar"
          onConfirm={() => deletePago(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
