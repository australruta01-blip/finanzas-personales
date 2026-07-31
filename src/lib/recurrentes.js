import { supabase } from './supabase'

// Genera los movimientos del mes actual para cada regla recurrente activa
// que todavía no tenga su transacción generada (evita duplicados usando
// recurrente_id + rango de fechas del mes). Solo genera reglas cuyo día
// ya pasó (o es hoy) para no crear movimientos con fecha futura.
export async function generarRecurrentesPendientes(userId) {
  const { data: reglas } = await supabase
    .from('recurrentes')
    .select('*')
    .eq('user_id', userId)
    .eq('activa', true)

  if (!reglas || reglas.length === 0) return 0

  const now = new Date()
  const anio = now.getFullYear()
  const mes = now.getMonth()
  const hoy = now.getDate()
  const inicioMes = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
  const finMes = `${anio}-${String(mes + 1).padStart(2, '0')}-28`

  const { data: yaGeneradas } = await supabase
    .from('transacciones')
    .select('recurrente_id')
    .eq('user_id', userId)
    .not('recurrente_id', 'is', null)
    .gte('fecha', inicioMes)
    .lte('fecha', finMes)

  const generadasSet = new Set((yaGeneradas || []).map(t => t.recurrente_id))

  const pendientes = reglas.filter(r => !generadasSet.has(r.id) && r.dia_mes <= hoy)
  if (pendientes.length === 0) return 0

  const nuevas = pendientes.map(r => ({
    user_id: userId,
    fecha: `${anio}-${String(mes + 1).padStart(2, '0')}-${String(r.dia_mes).padStart(2, '0')}`,
    monto: Number(r.monto),
    tipo: r.tipo,
    categoria: r.categoria,
    descripcion: r.descripcion || 'Movimiento recurrente',
    recurrente_id: r.id
  }))

  const { error } = await supabase.from('transacciones').insert(nuevas)
  if (error) return 0
  return nuevas.length
}
