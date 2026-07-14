import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

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

function fmtDiff(diff) {
  const sign = diff < 0 ? '-' : ''
  return sign + fmt(Math.abs(diff))
}

export default function Presupuesto({ userId, transacciones, onToast }) {
  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [tipo, setTipo] = useState('egreso')
  const [presupuestos, setPresupuestos] = useState([])
  const [categoriasCustomIngreso, setCategoriasCustomIngreso] = useState([])
  const [categoriasCustomEgreso, setCategoriasCustomEgreso] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingCat, setEditingCat] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [copiando, setCopiando] = useState(false)

  // ─── Fetch presupuestos del mes ───────────────────────────
  const fetchPresupuestos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('user_id', userId)
      .eq('mes', selMonth)
      .eq('anio', selYear)
    setPresupuestos(data || [])
    setLoading(false)
  }, [userId, selMonth, selYear])

  // ─── Fetch categorías personalizadas (una sola vez) ───────
  const fetchCategoriasCustom = useCallback(async () => {
    const { data } = await supabase
      .from('categorias_custom')
      .select('nombre, tipo')
      .eq('user_id', userId)
      .in('tipo', ['ingreso', 'egreso'])
    setCategoriasCustomIngreso(data?.filter(c => c.tipo === 'ingreso').map(c => c.nombre) || [])
    setCategoriasCustomEgreso(data?.filter(c => c.tipo === 'egreso').map(c => c.nombre) || [])
  }, [userId])

  useEffect(() => { fetchPresupuestos() }, [fetchPresupuestos])
  useEffect(() => { fetchCategoriasCustom() }, [fetchCategoriasCustom])

  function prevMonth() {
    if (selMonth === 0) { setSelMonth(11); setSelYear(y => y - 1) }
    else setSelMonth(m => m - 1)
  }
  function nextMonth() {
    if (selMonth === 11) { setSelMonth(0); setSelYear(y => y + 1) }
    else setSelMonth(m => m + 1)
  }

  const mesActual = useMemo(() => transacciones.filter(t => {
    const d = new Date(t.fecha)
    return d.getFullYear() === selYear && d.getMonth() === selMonth
  }), [transacciones, selYear, selMonth])

  // Categorías a mostrar: por defecto + custom + cualquiera usada en el mes (por si hay datos antiguos)
  const categorias = useMemo(() => {
    const defaults = tipo === 'ingreso' ? CATEGORIAS_INGRESO_DEFAULT : CATEGORIAS_EGRESO_DEFAULT
    const custom = tipo === 'ingreso' ? categoriasCustomIngreso : categoriasCustomEgreso
    const enTx = mesActual.filter(t => t.tipo === tipo).map(t => t.categoria)
    return [...new Set([...defaults, ...custom, ...enTx])]
  }, [tipo, categoriasCustomIngreso, categoriasCustomEgreso, mesActual])

  const filas = useMemo(() => {
    return categorias.map(cat => {
      const previsto = Number(
        presupuestos.find(p => p.categoria === cat && p.tipo === tipo)?.monto_previsto || 0
      )
      const real = mesActual
        .filter(t => t.tipo === tipo && t.categoria === cat)
        .reduce((s, t) => s + Number(t.monto), 0)
      return { categoria: cat, previsto, real, diferencia: previsto - real }
    })
  }, [categorias, presupuestos, tipo, mesActual])

  const totales = useMemo(() => ({
    previsto: filas.reduce((s, f) => s + f.previsto, 0),
    real: filas.reduce((s, f) => s + f.real, 0),
    diferencia: filas.reduce((s, f) => s + f.diferencia, 0),
  }), [filas])

  function iniciarEdicion(fila) {
    setEditingCat(fila.categoria)
    setEditValue(fila.previsto ? String(fila.previsto) : '')
  }

  async function guardarPrevisto(categoria) {
    const val = parseFloat(editValue) || 0
    setEditingCat(null)
    const payload = { user_id: userId, categoria, tipo, monto_previsto: val, mes: selMonth, anio: selYear }
    const { error } = await supabase
      .from('presupuestos')
      .upsert([payload], { onConflict: 'user_id,categoria,tipo,mes,anio' })
    if (!error) {
      onToast?.('Presupuesto guardado ✓')
      fetchPresupuestos()
    } else {
      onToast?.('Error al guardar presupuesto')
    }
  }

  async function copiarMesAnterior() {
    let pm = selMonth - 1
    let py = selYear
    if (pm < 0) { pm = 11; py -= 1 }
    setCopiando(true)
    const { data } = await supabase
      .from('presupuestos')
      .select('categoria, tipo, monto_previsto')
      .eq('user_id', userId)
      .eq('mes', pm)
      .eq('anio', py)
    if (!data || data.length === 0) {
      onToast?.('No hay presupuesto guardado el mes anterior')
      setCopiando(false)
      return
    }
    const rows = data.map(d => ({
      user_id: userId, categoria: d.categoria, tipo: d.tipo,
      monto_previsto: d.monto_previsto, mes: selMonth, anio: selYear
    }))
    const { error } = await supabase
      .from('presupuestos')
      .upsert(rows, { onConflict: 'user_id,categoria,tipo,mes,anio' })
    if (!error) {
      onToast?.('Presupuesto copiado del mes anterior ✓')
      fetchPresupuestos()
    } else {
      onToast?.('Error al copiar presupuesto')
    }
    setCopiando(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Cargando presupuesto...</div>

  return (
    <div>
      {/* Header + nav de mes */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Presupuesto</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} className="btn-ghost" style={{ padding: '5px 10px' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 500, minWidth: 110, textAlign: 'center' }}>
            {MESES[selMonth]} {selYear}
          </span>
          <button onClick={nextMonth} className="btn-ghost" style={{ padding: '5px 10px' }}>›</button>
        </div>
      </div>

      {/* Toggle egreso/ingreso + copiar mes anterior */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['egreso', 'ingreso'].map(t => (
            <button key={t} onClick={() => setTipo(t)}
              style={{
                padding: '7px 14px', border: '1.5px solid',
                borderColor: tipo === t ? 'var(--teal)' : 'var(--gray-200)',
                borderRadius: 8, background: tipo === t ? 'var(--teal-light)' : '#fff',
                color: tipo === t ? 'var(--teal-dark)' : 'var(--gray-400)',
                fontWeight: tipo === t ? 600 : 400, fontSize: 13, cursor: 'pointer'
              }}>
              {t === 'egreso' ? 'Gastos' : 'Ingresos'}
            </button>
          ))}
        </div>
        <button onClick={copiarMesAnterior} disabled={copiando} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
          {copiando ? 'Copiando...' : '⧉ Copiar mes anterior'}
        </button>
      </div>

      {/* KPIs de totales */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--gray-100)', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4, fontWeight: 500 }}>Previsto</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{fmt(totales.previsto)}</div>
        </div>
        <div style={{ background: 'var(--gray-100)', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4, fontWeight: 500 }}>Real</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{fmt(totales.real)}</div>
        </div>
        <div style={{ background: 'var(--gray-100)', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4, fontWeight: 500 }}>Diferencia</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: totales.diferencia < 0 ? 'var(--coral)' : 'var(--teal-dark)' }}>
            {fmtDiff(totales.diferencia)}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: 'var(--gray-600)' }}>
                {tipo === 'egreso' ? 'Gastos' : 'Ingresos'}
              </th>
              <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: 'var(--gray-600)' }}>Previsto</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: 'var(--gray-600)' }}>Real</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: 'var(--gray-600)' }}>Difer.</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
              <td style={{ padding: '10px 16px', fontStyle: 'italic', color: 'var(--gray-400)' }}>Totales</td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--teal-dark)' }}>{fmt(totales.previsto)}</td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>{fmt(totales.real)}</td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: totales.diferencia < 0 ? 'var(--coral)' : 'var(--gray-600)' }}>
                {fmtDiff(totales.diferencia)}
              </td>
            </tr>
            {filas.map(f => (
              <tr key={f.categoria} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 500 }}>{f.categoria}</td>
                <td
                  style={{ padding: '6px 16px', textAlign: 'right', background: 'var(--coral-light)', cursor: 'pointer' }}
                  onClick={() => editingCat !== f.categoria && iniciarEdicion(f)}
                  title="Click para editar el monto previsto"
                >
                  {editingCat === f.categoria ? (
                    <input
                      type="number"
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => guardarPrevisto(f.categoria)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); guardarPrevisto(f.categoria) }
                        if (e.key === 'Escape') setEditingCat(null)
                      }}
                      style={{ width: 110, textAlign: 'right', padding: '4px 6px' }}
                    />
                  ) : (
                    fmt(f.previsto)
                  )}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>{fmt(f.real)}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: f.diferencia < 0 ? 'var(--coral)' : 'var(--gray-600)' }}>
                  {fmtDiff(f.diferencia)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 10, textAlign: 'center' }}>
        Toca el monto de "Previsto" en una categoría para editarlo
      </div>
    </div>
  )
}
