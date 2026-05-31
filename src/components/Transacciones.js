import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import NuevaTransaccion from './NuevaTransaccion'
import ConfirmModal from './ConfirmModal'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmt(n) {
  const num = Number(n)
  const hasDecimals = num % 1 !== 0
  return '$' + (hasDecimals ? num.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : Math.round(num).toLocaleString('es-CL'))
}

export default function Transacciones({ transacciones, loading, onNew, onRefresh, onToast }) {
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroMes, setFiltroMes] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [editando, setEditando] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtradas = useMemo(() => {
    return transacciones.filter(t => {
      if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false
      if (filtroMes) {
        const d = new Date(t.fecha)
        if (`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` !== filtroMes) return false
      }
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (!t.descripcion?.toLowerCase().includes(q) && !t.categoria?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [transacciones, filtroTipo, filtroMes, busqueda])

  const totalIngresos = filtradas.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const totalEgresos = filtradas.filter(t => t.tipo === 'egreso').reduce((s, t) => s + Number(t.monto), 0)

  async function handleDelete(id) {
    setConfirmDelete(id)
  }

  async function confirmDeleteAction() {
    setDeleting(confirmDelete)
    await supabase.from('transacciones').delete().eq('id', confirmDelete)
    setConfirmDelete(null)
    onRefresh()
    setDeleting(null)
    onToast?.('Movimiento eliminado')
  }

  const agrupadas = useMemo(() => {
    const grupos = {}
    filtradas.forEach(t => {
      const d = new Date(t.fecha)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = `${MESES[d.getMonth()]} ${d.getFullYear()}`
      if (!grupos[key]) grupos[key] = { label, items: [] }
      grupos[key].items.push(t)
    })
    return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtradas])

  const mesesDisponibles = useMemo(() => {
    const set = new Set()
    transacciones.forEach(t => {
      const d = new Date(t.fecha)
      set.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
    })
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [transacciones])

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Movimientos</h2>
        <button onClick={onNew} className="btn-primary" style={{ padding: '8px 16px' }}>+ Nuevo</button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Buscar..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ width: 130 }}>
            <option value="todos">Todos</option>
            <option value="ingreso">Solo ingresos</option>
            <option value="egreso">Solo egresos</option>
          </select>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ width: 150 }}>
            <option value="">Todos los meses</option>
            {mesesDisponibles.map(m => {
              const [y, mo] = m.split('-')
              return <option key={m} value={m}>{MESES[parseInt(mo)-1]} {y}</option>
            })}
          </select>
        </div>
      </div>

      {/* Totales filtrados */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ background: 'var(--teal-light)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
          <span style={{ color: 'var(--teal-dark)' }}>Ingresos: <strong>{fmt(totalIngresos)}</strong></span>
        </div>
        <div style={{ background: 'var(--coral-light)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
          <span style={{ color: '#712B13' }}>Egresos: <strong>{fmt(totalEgresos)}</strong></span>
        </div>
        <div style={{ background: 'var(--gray-100)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
          <span style={{ color: 'var(--gray-600)' }}>{filtradas.length} registro{filtradas.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Lista agrupada */}
      {agrupadas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div>Sin movimientos {busqueda || filtroTipo !== 'todos' ? 'con estos filtros' : 'aún'}</div>
          {!busqueda && filtroTipo === 'todos' && (
            <button onClick={onNew} className="btn-primary" style={{ marginTop: 12 }}>Registrar primero</button>
          )}
        </div>
      ) : (
        agrupadas.map(([key, grupo]) => (
          <div key={key} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase',
              letterSpacing: '.06em', marginBottom: 8 }}>{grupo.label}</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {grupo.items.map((t, i) => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                  borderBottom: i < grupo.items.length - 1 ? '1px solid var(--gray-100)' : 'none'
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: t.tipo === 'ingreso' ? 'var(--teal-light)' : 'var(--coral-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15
                  }}>
                    {t.tipo === 'ingreso' ? '↑' : '↓'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.descripcion || t.categoria}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>
                      {t.categoria} · {new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: t.tipo === 'ingreso' ? '#1D9E75' : '#D85A30' }}>
                      {t.tipo === 'ingreso' ? '+' : '-'}{fmt(t.monto)}
                    </div>
                    <span className={`badge badge-${t.tipo === 'ingreso' ? 'income' : 'expense'}`}>
                      {t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                    style={{ background: 'none', border: 'none', color: 'var(--gray-200)',
                      fontSize: 16, padding: '4px', borderRadius: 4, marginLeft: 4 }}
                    title="Eliminar">
                    {deleting === t.id ? '…' : '×'}
                  </button>
                  <button onClick={() => setEditando(t)}
                    style={{ background: 'none', border: 'none', color: 'var(--gray-400)',
                      fontSize: 13, padding: '4px 6px', borderRadius: 4 }}
                    title="Editar">✏️</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {editando && (
        <NuevaTransaccion
          userId={editando.user_id}
          transaccionEditar={editando}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); onRefresh(); onToast?.('Movimiento actualizado') }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar movimiento?"
          message="Esta acción no se puede deshacer. El movimiento será eliminado permanentemente."
          confirmLabel="Sí, eliminar"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
