import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import DashboardHome from '../components/DashboardHome'
import Transacciones from '../components/Transacciones'
import Deudas from '../components/Deudas'
import NuevaTransaccion from '../components/NuevaTransaccion'

const NAV = [
  { id: 'home', label: 'Inicio', icon: '⊞' },
  { id: 'transacciones', label: 'Movimientos', icon: '↕' },
  { id: 'deudas', label: 'Deudas', icon: '💳' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [page, setPage] = useState('home')
  const [showModal, setShowModal] = useState(false)
  const [transacciones, setTransacciones] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTransacciones = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transacciones')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
    setTransacciones(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchTransacciones() }, [fetchTransacciones])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const nombre = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <header style={{
        background: '#fff', borderBottom: '1px solid var(--gray-200)',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>💰</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Finanzas</span>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{
                background: page === n.id ? 'var(--gray-100)' : 'none',
                border: 'none', borderRadius: 8, padding: '6px 12px',
                fontWeight: page === n.id ? 500 : 400,
                color: page === n.id ? 'var(--gray-900)' : 'var(--gray-400)',
                fontSize: 13
              }}>
              <span style={{ marginRight: 5 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-600)', display: 'none' }}
            className="hide-mobile">{nombre}</span>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--teal-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, color: 'var(--teal-dark)'
          }}>
            {nombre[0].toUpperCase()}
          </div>
          <button onClick={handleLogout} className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}>
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
            onRefresh={fetchTransacciones}
          />
        )}
        {page === 'deudas' && (
          <Deudas userId={user.id} />
        )}
      </main>

      {/* FAB */}
      <button onClick={() => setShowModal(true)} style={{
        position: 'fixed', bottom: 24, right: 24,
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--gray-900)', color: '#fff',
        border: 'none', fontSize: 24, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        zIndex: 200
      }} title="Nuevo movimiento">+</button>

      {/* Modal */}
      {showModal && (
        <NuevaTransaccion
          userId={user.id}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchTransacciones() }}
        />
      )}
    </div>
  )
}
