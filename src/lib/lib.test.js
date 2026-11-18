import { describe, expect, it } from 'vitest'
import { parseCSV, toCSV } from './csv'
import { limpiarVentas, normalizarCanal, normalizarFecha, SIN_CANAL } from './clean'
import { filtrar, kpis, porDimension, rangos, serieTiempo, sumarMeses, variacion } from './metrics'

describe('csv', () => {
  it('lee comillas, comas y comillas escapadas', () => {
    const rows = parseCSV('a,b\n"x, y","di ""hola"""\r\n1,2\n')
    expect(rows).toEqual([
      { a: 'x, y', b: 'di "hola"' },
      { a: '1', b: '2' },
    ])
  })
  it('exporta escapando lo necesario', () => {
    const csv = toCSV([{ n: 'Kit, 520', v: 3 }], [{ key: 'n', label: 'Producto' }, { key: 'v', label: 'Uds' }])
    expect(csv).toBe('Producto,Uds\n"Kit, 520",3')
  })
})

describe('limpieza', () => {
  it('normaliza variantes de canal', () => {
    expect(normalizarCanal(' Mostrador ').canal).toBe('Mostrador')
    expect(normalizarCanal('TIENDA EN LINEA').canal).toBe('Tienda en línea')
    expect(normalizarCanal('WA').canal).toBe('WhatsApp')
    expect(normalizarCanal('').canal).toBe(SIN_CANAL)
    expect(normalizarCanal('WhatsApp').cambiado).toBe(false)
  })
  it('convierte DD/MM/AAAA y rechaza fechas imposibles', () => {
    expect(normalizarFecha('05/03/2025')).toEqual({ fecha: '2025-03-05', convertida: true })
    expect(normalizarFecha('2025-03-05')).toEqual({ fecha: '2025-03-05', convertida: false })
    expect(normalizarFecha('31/02/2025')).toBeNull()
    expect(normalizarFecha('ayer')).toBeNull()
  })

  const base = { folio: 'R-1', fecha: '2025-01-10', canal: 'Mostrador', sku: 'A', producto: 'Bujía', categoria: 'Motor', cantidad: '2', precio_unitario: '100', descuento_pct: '10', estatus: 'Entregado' }

  it('quita duplicados, descarta cantidades inválidas y recupera precios', () => {
    const { filas, reporte } = limpiarVentas([
      base,
      { ...base },
      { ...base, folio: 'R-2', cantidad: '0' },
      { ...base, folio: 'R-3', precio_unitario: '' },
      { ...base, folio: 'R-4', canal: 'whatsapp', fecha: '11/01/2025' },
    ])
    expect(reporte.duplicadas).toBe(1)
    expect(reporte.cantidadesInvalidas).toBe(1)
    expect(reporte.preciosRecuperados).toBe(1)
    expect(reporte.canalesNormalizados).toBe(1)
    expect(reporte.fechasConvertidas).toBe(1)
    expect(filas).toHaveLength(3)
    expect(filas[0].importe).toBe(180)
    expect(filas[1].precio).toBe(100)
  })
})

describe('métricas', () => {
  const f = (folio, mes, estatus, importe, extra = {}) => ({ folio, mes, fecha: `${mes}-01`, estatus, importe, cantidad: 1, canal: 'Mostrador', categoria: 'Motor', sku: 'A', producto: 'Bujía', ...extra })

  it('calcula ventas, pedidos, ticket y devolución', () => {
    const filas = [f('1', '2025-01', 'Entregado', 100), f('1', '2025-01', 'Entregado', 50), f('2', '2025-01', 'Entregado', 150), f('3', '2025-01', 'Devuelto', 80), f('4', '2025-01', 'Cancelado', 999)]
    const k = kpis(filas)
    expect(k.ventas).toBe(300)
    expect(k.pedidos).toBe(2)
    expect(k.ticket).toBe(150)
    expect(k.devolucion).toBeCloseTo(1 / 3)
  })
  it('calcula periodos y su periodo anterior', () => {
    expect(sumarMeses('2025-01', -1)).toBe('2024-12')
    expect(rangos('2025-12', 3)).toEqual({ actual: { desde: '2025-10', hasta: '2025-12' }, anterior: { desde: '2025-07', hasta: '2025-09' } })
    expect(variacion(120, 100)).toBeCloseTo(0.2)
    expect(variacion(5, 0)).toBeNull()
  })
  it('filtra por canal y agrupa por dimensión', () => {
    const filas = [f('1', '2025-01', 'Entregado', 300), f('2', '2025-01', 'Entregado', 100, { canal: 'WhatsApp' })]
    expect(filtrar(filas, { desde: '2025-01', hasta: '2025-01', canal: 'WhatsApp' })).toHaveLength(1)
    const canales = porDimension(filas, 'canal')
    expect(canales[0]).toMatchObject({ nombre: 'Mostrador', participacion: 0.75 })
  })
  it('usa serie diaria para un solo mes', () => {
    const r = rangos('2025-02', 1)
    const s = serieTiempo([f('1', '2025-02', 'Entregado', 10)], [], r.actual, r.anterior)
    expect(s).toHaveLength(31) // enero (anterior) tiene 31 días
    expect(s[0].actual).toBe(10)
    expect(s[29].actual).toBeNull() // febrero 2025 solo tiene 28
  })
})
