import React, { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const CATEGORIAS_COLOR = {
  'Vivienda': '#1D9E75', 'Alimentación': '#D85A30', 'Transporte': '#BA7517',
  'Salud': '#D4537E', 'Entretenimiento': '#7F77DD', 'Educación': '#378ADD',
  'Ropa': '#EF9F27', 'Otros': '#888780'
}

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function KPI({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--gray-100)', borderRadius: 10,
      padding: '14px 18px', flex: 1, minWidth: 120
    }}>
      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: color || 'var(--gray-900)' }}>{value}</div>
    </div>
  )
}

export default function DashboardHome({ transacciones, loading, onNew }) {
  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())

  const mesActual = useMemo(() => transacciones.filter(t => {
    const d = new Date(t.fecha)
    return d.getFullYear() === selYear && d.getMonth() === selMonth
  }), [transacciones, selYear, selMonth])

  const ingresos = useMemo(() => mesActual.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0), [mesActual])
  const egresos = useMemo(() => mesActual.filter(t => t.tipo === 'egreso').reduce((s, t) => s + Number(t.monto), 0), [mesActual])
  const balance = ingresos - egresos

  const barData = useMemo(() => {
    return MESES.map((mes, i) => {
      const txs = transacciones.filter(t => {
        const d = new Date(t.fecha)
        return d.getFullYear() === selYear && d.getMonth() === i
      })
      return {
        mes,
        Ingresos: txs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0),
        Egresos: txs.filter(t => t.tipo === 'egreso').reduce((s, t) => s + Number(t.monto), 0),
      }
    })
  }, [transacciones, selYear])

  const pieData = useMemo(() => {
    const cats = {}
    mesActual.filter(t => t.tipo === 'egreso').forEach(t => {
      cats[t.categoria] = (cats[t.categoria] || 0) + Number(t.monto)
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value }))
  }, [mesActual])

  const ultimas = transacciones.slice(0, 5)

  function prevMonth() {
    if (selMonth === 0) { setSelMonth(11); setSelYear(y => y - 1) }
    else setSelMonth(m => m - 1)
  }
  function nextMonth() {
    if (selMonth === 11) { setSelMonth(0); setSelYear(y => y + 1) }
    else setSelMonth(m => m + 1)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Cargando datos...</div>

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Resumen financiero</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} className="btn-ghost" style={{ padding: '5px 10px' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 500, minWidth: 110, textAlign: 'center' }}>
            {MESES[selMonth]} {selYear}
          </span>
          <button onClick={nextMonth} className="btn-ghost" style={{ padding: '5px 10px' }}>›</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPI label="Ingresos" value={fmt(ingresos)} color="#1D9E75" />
        <KPI label="Egresos" value={fmt(egresos)} color="#D85A30" />
        <KPI label="Balance" value={(balance >= 0 ? '+' : '') + fmt(balance)}
          color={balance >= 0 ? '#1D9E75' : '#D85A30'} />
        <KPI label="Movimientos" value={mesActual.length} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-400)', marginBottom: 12 }}>
            Evolución anual {selYear}
          </div>
          {transacciones.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#888780' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888780' }}
                  tickFormatter={v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
                <Tooltip formatter={v => fmt(v)} labelStyle={{ fontWeight: 600 }} />
                <Bar dataKey="Ingresos" fill="#5DCAA5" radius={[3,3,0,0]} />
                <Bar dataKey="Egresos" fill="#F0997B" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-400)', marginBottom: 12 }}>
            Gastos por categoría — {MESES[selMonth]}
          </div>
          {pieData.length === 0 ? (
            <EmptyChart msg="Sin egresos este mes" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORIAS_COLOR[entry.name] || '#888780'} />
                  ))}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
                <Legend iconSize={8} iconType="circle"
                  formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Últimas transacciones */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-400)' }}>Últimos movimientos</span>
          <button onClick={onNew} className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}>
            + Nuevo
          </button>
        </div>
        {ultimas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
            <div style={{ fontSize: 13 }}>Sin movimientos aún</div>
            <button onClick={onNew} className="btn-primary" style={{ marginTop: 12 }}>Registrar primero</button>
          </div>
        ) : (
          ultimas.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 0', borderBottom: '1px solid var(--gray-100)'
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: t.tipo === 'ingreso' ? 'var(--teal-light)' : 'var(--coral-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
              }}>
                {t.tipo === 'ingreso' ? '↑' : '↓'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.descripcion || t.categoria}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                  {t.categoria} · {new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-CL')}
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: t.tipo === 'ingreso' ? '#1D9E75' : '#D85A30' }}>
                {t.tipo === 'ingreso' ? '+' : '-'}{fmt(t.monto)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function EmptyChart({ msg = 'Sin datos aún' }) {
  return (
    <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-200)', fontSize: 13 }}>
      {msg}
    </div>
  )
}
