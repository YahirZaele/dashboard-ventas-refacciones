import { useState } from 'react'
import { toCSV } from '../lib/csv'
import { fmtMXN, fmtNum, fmtPct } from '../format'

const COLUMNAS = [
  { key: 'producto', label: 'Producto' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'unidades', label: 'Unidades', num: true, format: fmtNum },
  { key: 'ventas', label: 'Ventas netas', num: true, format: fmtMXN },
  { key: 'participacion', label: '% del total', num: true, format: (v) => fmtPct(v) },
]

// Top de productos con columnas ordenables y exportación a CSV.
export default function TopTable({ rows, nombreArchivo }) {
  const [orden, setOrden] = useState({ key: 'ventas', dir: 'desc' })

  const ordenadas = [...rows].sort((a, b) => {
    const va = a[orden.key]
    const vb = b[orden.key]
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
    return orden.dir === 'asc' ? cmp : -cmp
  })

  function ordenarPor(key) {
    setOrden((o) => (o.key === key ? { key, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: typeof rows[0]?.[key] === 'number' ? 'desc' : 'asc' }))
  }

  function exportar() {
    const csv = toCSV(
      ordenadas.map((r) => ({ ...r, ventas: r.ventas.toFixed(2), participacion: (r.participacion * 100).toFixed(2) })),
      [{ key: 'sku', label: 'SKU' }, ...COLUMNAS.map((c) => ({ ...c, label: c.key === 'participacion' ? 'Porcentaje del total' : c.label }))],
    )
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="table-scroll">
        <table className="top-table">
          <thead>
            <tr>
              <th scope="col" className="num">#</th>
              {COLUMNAS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={c.num ? 'num' : ''}
                  aria-sort={orden.key === c.key ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className="sort" onClick={() => ordenarPor(c.key)}>
                    {c.label}
                    <span aria-hidden="true">{orden.key === c.key ? (orden.dir === 'asc' ? ' ↑' : ' ↓') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((r, i) => (
              <tr key={r.sku}>
                <td className="num muted">{i + 1}</td>
                {COLUMNAS.map((c) => (
                  <td key={c.key} className={c.num ? 'num' : ''}>
                    {c.format ? c.format(r[c.key]) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn-secondary" onClick={exportar} disabled={rows.length === 0}>
        Descargar CSV
      </button>
    </div>
  )
}
