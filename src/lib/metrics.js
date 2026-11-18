// Cálculo de indicadores. Mismas definiciones que sql/consultas.sql:
// - Ventas netas: suma del importe (con descuento) de pedidos "Entregado".
// - Pedidos: folios distintos con estatus "Entregado".
// - Ticket promedio: ventas netas / pedidos.
// - Tasa de devolución: folios "Devuelto" / folios entregados o devueltos (los cancelados no cuentan).

export const PERIODOS = [
  { id: '12m', label: 'Últimos 12 meses', meses: 12 },
  { id: '6m', label: 'Últimos 6 meses', meses: 6 },
  { id: '3m', label: 'Últimos 3 meses', meses: 3 },
  { id: '1m', label: 'Último mes', meses: 1 },
]

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function sumarMeses(mes, n) {
  const [y, m] = mes.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

export function etiquetaMes(mes, conAnio = true) {
  const [y, m] = mes.split('-')
  return conAnio ? `${MESES_CORTOS[Number(m) - 1]} ${y.slice(2)}` : MESES_CORTOS[Number(m) - 1]
}

export function rangoMeses(desde, hasta) {
  const out = []
  for (let m = desde; m <= hasta; m = sumarMeses(m, 1)) out.push(m)
  return out
}

// Periodo seleccionado y periodo anterior de la misma duración.
export function rangos(ultimoMes, meses) {
  const hasta = ultimoMes
  const desde = sumarMeses(hasta, -(meses - 1))
  return {
    actual: { desde, hasta },
    anterior: { desde: sumarMeses(desde, -meses), hasta: sumarMeses(hasta, -meses) },
  }
}

export function filtrar(filas, { desde, hasta, canal = 'Todos', categoria = 'Todas' }) {
  return filas.filter(
    (f) =>
      f.mes >= desde &&
      f.mes <= hasta &&
      (canal === 'Todos' || f.canal === canal) &&
      (categoria === 'Todas' || f.categoria === categoria),
  )
}

export function kpis(filas) {
  let ventas = 0
  const entregados = new Set()
  const devueltos = new Set()
  for (const f of filas) {
    if (f.estatus === 'Entregado') {
      ventas += f.importe
      entregados.add(f.folio)
    } else if (f.estatus === 'Devuelto') {
      devueltos.add(f.folio)
    }
  }
  const pedidos = entregados.size
  const base = pedidos + devueltos.size
  return {
    ventas,
    pedidos,
    ticket: pedidos ? ventas / pedidos : 0,
    devolucion: base ? devueltos.size / base : 0,
  }
}

// Variación relativa (0.12 = +12 %). null si no hay base de comparación.
export function variacion(actual, anterior) {
  if (!anterior) return null
  return (actual - anterior) / anterior
}

const entregadas = (filas) => filas.filter((f) => f.estatus === 'Entregado')

function sumarPor(filas, llave) {
  const m = new Map()
  for (const f of entregadas(filas)) {
    const k = llave(f)
    const acc = m.get(k) ?? { ventas: 0, unidades: 0 }
    acc.ventas += f.importe
    acc.unidades += f.cantidad
    m.set(k, acc)
  }
  return m
}

// Serie para la gráfica de línea. Para un solo mes la serie es diaria; si no, mensual.
export function serieTiempo(filasActual, filasAnterior, actual, anterior) {
  if (actual.desde === actual.hasta) {
    const dias = (mes) => new Date(Date.UTC(...mes.split('-').map(Number), 0)).getUTCDate()
    const porDia = (filas) => sumarPor(filas, (f) => Number(f.fecha.slice(8, 10)))
    const a = porDia(filasActual)
    const b = porDia(filasAnterior)
    const n = Math.max(dias(actual.desde), dias(anterior.desde))
    return Array.from({ length: n }, (_, i) => ({
      etiqueta: String(i + 1),
      detalle: `${i + 1} ${etiquetaMes(actual.desde)}`,
      actual: i < dias(actual.desde) ? (a.get(i + 1)?.ventas ?? 0) : null,
      anterior: i < dias(anterior.desde) ? (b.get(i + 1)?.ventas ?? 0) : null,
    }))
  }
  const a = sumarPor(filasActual, (f) => f.mes)
  const b = sumarPor(filasAnterior, (f) => f.mes)
  const mesesB = rangoMeses(anterior.desde, anterior.hasta)
  return rangoMeses(actual.desde, actual.hasta).map((mes, i) => ({
    etiqueta: etiquetaMes(mes),
    detalle: etiquetaMes(mes),
    detalleAnterior: etiquetaMes(mesesB[i]),
    actual: a.get(mes)?.ventas ?? 0,
    anterior: b.get(mesesB[i])?.ventas ?? 0,
  }))
}

// Ventas por una dimensión (categoría, canal), ordenadas de mayor a menor, con participación.
export function porDimension(filas, campo) {
  const m = sumarPor(filas, (f) => f[campo])
  const total = [...m.values()].reduce((s, v) => s + v.ventas, 0)
  return [...m.entries()]
    .map(([nombre, v]) => ({ nombre, ...v, participacion: total ? v.ventas / total : 0 }))
    .sort((x, y) => y.ventas - x.ventas)
}

export function topProductos(filas, n = 10) {
  const m = sumarPor(filas, (f) => `${f.sku}|${f.producto}|${f.categoria}`)
  const total = [...m.values()].reduce((s, v) => s + v.ventas, 0)
  return [...m.entries()]
    .map(([k, v]) => {
      const [sku, producto, categoria] = k.split('|')
      return { sku, producto, categoria, ...v, participacion: total ? v.ventas / total : 0 }
    })
    .sort((x, y) => y.ventas - x.ventas)
    .slice(0, n)
}

// Hallazgos automáticos en texto, a partir de las mismas métricas.
export function hallazgos(filasActual, filasAnterior) {
  const out = []
  const canA = porDimension(filasActual, 'canal')
  const canB = new Map(porDimension(filasAnterior, 'canal').map((c) => [c.nombre, c.ventas]))
  const crec = canA
    .filter((c) => canB.get(c.nombre))
    .map((c) => ({ ...c, var: variacion(c.ventas, canB.get(c.nombre)) }))
    .sort((x, y) => y.var - x.var)
  if (crec.length > 1) {
    out.push({ tipo: 'canal', nombre: crec[0].nombre, valor: crec[0].var })
  }
  const cat = porDimension(filasActual, 'categoria')
  if (cat.length > 1) out.push({ tipo: 'categoria', nombre: cat[0].nombre, valor: cat[0].participacion })
  const top = topProductos(filasActual, 1)[0]
  if (top) out.push({ tipo: 'producto', nombre: top.producto, valor: top.unidades })
  return out
}
