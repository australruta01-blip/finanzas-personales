const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmt(n) {
  return '$' + Math.round(Number(n)).toLocaleString('es-CL')
}

// ─── CSV ────────────────────────────────────────────────────────────────────
export function exportCSV(transacciones, mes, anio) {
  const label = mes !== null ? `${MESES[mes]}_${anio}` : 'todos'
  const filtradas = mes !== null
    ? transacciones.filter(t => { const d = new Date(t.fecha); return d.getFullYear() === anio && d.getMonth() === mes })
    : transacciones

  const header = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto (CLP)']
  const rows = filtradas.map(t => [
    new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-CL'),
    t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
    t.categoria,
    t.descripcion || '',
    Number(t.monto).toFixed(2)
  ])

  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `finanzas_${label}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── PDF (ventana de impresión) ──────────────────────────────────────────────
export function exportPDF(transacciones, deudas, mes, anio) {
  const label = mes !== null ? `${MESES[mes]} ${anio}` : `Año ${anio}`
  const filtradas = mes !== null
    ? transacciones.filter(t => { const d = new Date(t.fecha); return d.getFullYear() === anio && d.getMonth() === mes })
    : transacciones

  const ingresos = filtradas.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const egresos  = filtradas.filter(t => t.tipo === 'egreso').reduce((s, t) => s + Number(t.monto), 0)
  const balance  = ingresos - egresos

  const deudasPend = (deudas || []).filter(d => d.estado === 'pendiente')
  const totalDebo  = deudasPend.filter(d => d.direccion === 'debo').reduce((s, d) => s + Number(d.monto), 0)
  const totalMeDeben = deudasPend.filter(d => d.direccion === 'me deben').reduce((s, d) => s + Number(d.monto), 0)

  const rows = filtradas.map(t => `
    <tr>
      <td>${new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-CL')}</td>
      <td><span class="${t.tipo}">${t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</span></td>
      <td>${t.categoria}</td>
      <td>${t.descripcion || '—'}</td>
      <td class="monto ${t.tipo}">${t.tipo === 'ingreso' ? '+' : '-'}${fmt(t.monto)}</td>
    </tr>`).join('')

  const deudaRows = deudasPend.map(d => `
    <tr>
      <td>${d.nombre_persona}</td>
      <td>${d.direccion === 'debo' ? 'Debo a' : 'Me debe'}</td>
      <td>${d.notas || '—'}</td>
      <td class="monto ${d.direccion === 'debo' ? 'egreso' : 'ingreso'}">${fmt(d.monto)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte Finanzas — ${label}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1C1C1A; padding: 32px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .title { font-size: 22px; font-weight: 700; }
    .subtitle { color: #888; font-size: 13px; margin-top: 4px; }
    .kpis { display: flex; gap: 12px; margin-bottom: 28px; }
    .kpi { flex: 1; border: 1px solid #eee; border-radius: 10px; padding: 14px 16px; }
    .kpi-label { font-size: 11px; color: #888; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em; }
    .kpi-val { font-size: 20px; font-weight: 700; }
    .kpi-val.green { color: #1D9E75; }
    .kpi-val.red { color: #D85A30; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #888; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    th { text-align: left; padding: 8px 10px; background: #F9F9F7; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #eee; }
    td { padding: 9px 10px; border-bottom: 1px solid #F1EFE8; font-size: 13px; vertical-align: top; }
    .ingreso { color: #1D9E75; }
    .egreso  { color: #D85A30; }
    span.ingreso { background: #E1F5EE; padding: 2px 7px; border-radius: 8px; font-size: 11px; font-weight: 600; }
    span.egreso  { background: #FAECE7; padding: 2px 7px; border-radius: 8px; font-size: 11px; font-weight: 600; }
    .monto { font-weight: 600; text-align: right; }
    .footer { margin-top: 20px; font-size: 11px; color: #aaa; text-align: center; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">💰 Reporte Financiero</div>
      <div class="subtitle">${label} · Generado el ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Ingresos</div><div class="kpi-val green">${fmt(ingresos)}</div></div>
    <div class="kpi"><div class="kpi-label">Egresos</div><div class="kpi-val red">${fmt(egresos)}</div></div>
    <div class="kpi"><div class="kpi-label">Balance</div><div class="kpi-val ${balance >= 0 ? 'green' : 'red'}">${balance >= 0 ? '+' : ''}${fmt(balance)}</div></div>
    <div class="kpi"><div class="kpi-label">Movimientos</div><div class="kpi-val">${filtradas.length}</div></div>
  </div>

  <div class="section-title">Movimientos del período</div>
  <table>
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th style="text-align:right">Monto</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">Sin movimientos</td></tr>'}</tbody>
  </table>

  ${deudasPend.length > 0 ? `
  <div class="section-title">Deudas pendientes</div>
  <div class="kpis" style="margin-bottom:16px">
    <div class="kpi"><div class="kpi-label">Debo</div><div class="kpi-val red">${fmt(totalDebo)}</div></div>
    <div class="kpi"><div class="kpi-label">Me deben</div><div class="kpi-val green">${fmt(totalMeDeben)}</div></div>
  </div>
  <table>
    <thead><tr><th>Persona</th><th>Tipo</th><th>Notas</th><th style="text-align:right">Monto</th></tr></thead>
    <tbody>${deudaRows}</tbody>
  </table>` : ''}

  <div class="footer">Finanzas Personales · Este reporte es confidencial</div>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte_finanzas_${label.replace(/\s/g, '_')}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
