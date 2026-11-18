// Limpieza del export crudo de ventas. Cada regla cuenta cuántas filas tocó para
// el reporte de calidad de datos que se muestra en el tablero.

export const CANALES = ['Mostrador', 'Tienda en línea', 'WhatsApp']
export const SIN_CANAL = 'No registrado'

const ALIAS_CANAL = {
  mostrador: 'Mostrador',
  'tienda en linea': 'Tienda en línea',
  web: 'Tienda en línea',
  whatsapp: 'WhatsApp',
  wa: 'WhatsApp',
}

const quitarAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

// Devuelve { canal, cambiado }. Canal vacío -> "No registrado".
export function normalizarCanal(valor) {
  const limpio = (valor ?? '').trim()
  if (limpio === '') return { canal: SIN_CANAL, cambiado: true }
  const oficial = ALIAS_CANAL[quitarAcentos(limpio).toLowerCase()]
  if (!oficial) return { canal: limpio, cambiado: false }
  return { canal: oficial, cambiado: oficial !== limpio }
}

// Acepta AAAA-MM-DD o DD/MM/AAAA. Devuelve { fecha: 'AAAA-MM-DD', convertida } o null si no es válida.
export function normalizarFecha(valor) {
  const v = (valor ?? '').trim()
  let y, m, d, convertida
  let match = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    ;[, y, m, d] = match
    convertida = false
  } else if ((match = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    ;[, d, m, y] = match
    convertida = true
  } else {
    return null
  }
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const dt = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== iso) return null
  return { fecha: iso, convertida }
}

export function limpiarVentas(crudas) {
  const reporte = {
    filasLeidas: crudas.length,
    duplicadas: 0,
    canalesNormalizados: 0,
    canalesVacios: 0,
    fechasConvertidas: 0,
    fechasInvalidas: 0,
    cantidadesInvalidas: 0,
    preciosRecuperados: 0,
    preciosSinRecuperar: 0,
    filasValidas: 0,
  }

  // 1) Duplicados exactos: el export repite renglones completos.
  const vistas = new Set()
  const unicas = []
  for (const r of crudas) {
    const llave = JSON.stringify(r)
    if (vistas.has(llave)) {
      reporte.duplicadas++
      continue
    }
    vistas.add(llave)
    unicas.push(r)
  }

  // 2) Precio de referencia por SKU y año (el más frecuente), para recuperar precios vacíos.
  const conteo = new Map()
  for (const r of unicas) {
    const precio = Number(r.precio_unitario)
    const f = normalizarFecha(r.fecha)
    if (!r.precio_unitario || !(precio > 0) || !f) continue
    const llave = `${r.sku}|${f.fecha.slice(0, 4)}`
    const porPrecio = conteo.get(llave) ?? new Map()
    porPrecio.set(precio, (porPrecio.get(precio) ?? 0) + 1)
    conteo.set(llave, porPrecio)
  }
  const precioRef = new Map()
  for (const [llave, porPrecio] of conteo) {
    precioRef.set(llave, [...porPrecio.entries()].sort((a, b) => b[1] - a[1])[0][0])
  }

  // 3) Reglas por fila.
  const filas = []
  for (const r of unicas) {
    const f = normalizarFecha(r.fecha)
    if (!f) {
      reporte.fechasInvalidas++
      continue
    }
    if (f.convertida) reporte.fechasConvertidas++

    const cantidad = Number(r.cantidad)
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      reporte.cantidadesInvalidas++
      continue
    }

    let precio = Number(r.precio_unitario)
    if (!r.precio_unitario || !(precio > 0)) {
      precio = precioRef.get(`${r.sku}|${f.fecha.slice(0, 4)}`)
      if (!precio) {
        reporte.preciosSinRecuperar++
        continue
      }
      reporte.preciosRecuperados++
    }

    const { canal, cambiado } = normalizarCanal(r.canal)
    if (canal === SIN_CANAL) reporte.canalesVacios++
    else if (cambiado) reporte.canalesNormalizados++

    const descuento = Number(r.descuento_pct) || 0
    filas.push({
      folio: r.folio,
      fecha: f.fecha,
      mes: f.fecha.slice(0, 7),
      canal,
      sku: r.sku,
      producto: r.producto,
      categoria: r.categoria,
      cantidad,
      precio,
      descuento,
      estatus: r.estatus,
      importe: Math.round(cantidad * precio * (1 - descuento / 100) * 100) / 100,
    })
  }
  reporte.filasValidas = filas.length
  return { filas, reporte }
}
