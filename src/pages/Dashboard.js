import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import DashboardHome from '../components/DashboardHome'
import Transacciones from '../components/Transacciones'
import Deudas from '../components/Deudas'
import NuevaTransaccion from '../components/NuevaTransaccion'
import Toast from '../components/Toast'
import { exportCSV, exportPDF } from '../lib/exportUtils'

const NAV = [
  { id: 'home',          label: 'Inicio',      icon: '⊞' },
  { id: 'transacciones', label: 'Movimientos',  icon: '↕' },
  { id: 'deudas',        label: 'Deudas',       icon: '💳' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [page, setPage] = useState('home')
  const [showModal, setShowModal] = useState(false)
  const [transacciones, setTransacciones] = useState([])
  const [deudas, setDeudas] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showExport, setShowExport] = useState(false)

  const now = new Date()
  const [exportMes, setExportMes] = useState(now.getMonth())
  const [exportAnio, setExportAnio] = useState(now.getFullYear())
  const [exportTodo, setExportTodo] = useState(false)

  const showToast = useCallback((msg) => {
    setToast(msg)
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: txs }, { data: dds }] = await Promise.all([
      supabase.from('transacciones').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
      supabase.from('deudas').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    ])
    setTransacciones(txs || [])
    setDeudas(dds || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function handleExportCSV() {
    exportCSV(transacciones, exportTodo ? null : exportMes, exportAnio)
    setShowExport(false)
    showToast('CSV descargado correctamente')
  }

  function handleExportPDF() {
    exportPDF(transacciones, deudas, exportTodo ? null : exportMes, exportAnio)
    setShowExport(false)
    showToast('Reporte descargado')
  }

  const nombre = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <header style={{
        background: '#fff', borderBottom: '1px solid var(--gray-200)',
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, gap: 8
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>💰</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Finanzas</span>
        </div>

        {/* Nav central */}
        <nav style={{ display: 'flex', gap: 2, flex: 1, justifyContent: 'center' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{
                background: page === n.id ? 'var(--gray-100)' : 'none',
                border: 'none', borderRadius: 8, padding: '6px 8px',
                fontWeight: page === n.id ? 600 : 400,
                color: page === n.id ? 'var(--gray-900)' : 'var(--gray-400)',
                fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
              }}>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Acciones derechas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShowExport(true)}
            style={{
              background: 'none', border: '1px solid var(--gray-200)', borderRadius: 8,
              padding: '5px 8px', fontSize: 12, color: 'var(--gray-600)', cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}>
            ⬇
          </button>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--teal-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'var(--teal-dark)', flexShrink: 0
          }}>
            {nombre[0].toUpperCase()}
          </div>
          <button onClick={handleLogout} className="btn-ghost" style={{ padding: '5px 8px', fontSize: 12 }}>
            Salir
          </button>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, padding: '20px 20px 80px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {page === 'home' && (
          <DashboardHome
            transacciones={transacciones}
            loading={loading}
            onNew={() => setShowModal(true)}
          />
        )}
        {page === 'transacciones' && (
          <Transacciones
            transacciones={transacciones}
            loading={loading}
            onNew={() => setShowModal(true)}
            onRefresh={fetchAll}
            onToast={showToast}
          />
        )}
        {page === 'deudas' && (
          <Deudas userId={user.id} onToast={showToast} />
        )}
      </main>

      {/* FAB - solo fuera de Deudas */}
      {page !== 'deudas' && (
        <button onClick={() => setShowModal(true)} style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--gray-900)', color: '#fff',
          border: 'none', fontSize: 24, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 200, cursor: 'pointer'
        }} title="Nuevo movimiento">+</button>
      )}

      {/* Modal nueva transacción */}
      {showModal && (
        <NuevaTransaccion
          userId={user.id}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAll(); showToast('Movimiento guardado') }}
        />
      )}

      {/* Modal exportar */}
      {showExport && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 20
        }} onClick={() => setShowExport(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '24px 22px',
            width: '100%', maxWidth: 360
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📤 Exportar datos</h3>

            <div className="form-group">
              <label>
                <input type="checkbox" checked={exportTodo} onChange={e => setExportTodo(e.target.checked)} style={{ width: 'auto', marginRight: 8 }} />
                Exportar todo el historial
              </label>
            </div>

            {!exportTodo && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label>Mes</label>
                  <select value={exportMes} onChange={e => setExportMes(Number(e.target.value))}>
                    {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Año</label>
                  <select value={exportAnio} onChange={e => setExportAnio(Number(e.target.value))}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={handleExportCSV}
                style={{
                  flex: 1, padding: '10px 0', border: '1px solid var(--gray-200)',
                  borderRadius: 10, background: '#fff', cursor: 'pointer',
                  fontWeight: 500, fontSize: 13
                }}>
                📊 CSV (Excel)
              </button>
              <button onClick={handleExportPDF}
                style={{
                  flex: 1, padding: '10px 0', border: 'none',
                  borderRadius: 10, background: 'var(--gray-900)', color: '#fff',
                  cursor: 'pointer', fontWeight: 500, fontSize: 13
                }}>
                🖨 Reporte HTML
              </button>
            </div>
            <button onClick={() => setShowExport(false)} className="btn-ghost"
              style={{ width: '100%', marginTop: 8, padding: '10px 0' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
