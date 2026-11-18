import { useState } from 'react'
import { fmtCompacto, fmtMXN, fmtNum, fmtPct } from '../format'

// Barras horizontales de una sola serie (ventas por categoría), con el valor en la punta
// y detalle al pasar el cursor o enfocar la fila.
export default function BarList({ items }) {
  const [activo, setActivo] = useState(null)
  const max = Math.max(...items.map((i) => i.ventas), 1)
  return (
    <ul className="barlist">
      {items.map((it) => (
        <li
          key={it.nombre}
          tabIndex={0}
          className={activo === it.nombre ? 'active' : ''}
          onPointerEnter={() => setActivo(it.nombre)}
          onPointerLeave={() => setActivo(null)}
          onFocus={() => setActivo(it.nombre)}
          onBlur={() => setActivo(null)}
          aria-label={`${it.nombre}: ${fmtMXN(it.ventas)}, ${fmtPct(it.participacion)} del total, ${fmtNum(it.unidades)} unidades`}
        >
          <span className="bar-name">{it.nombre}</span>
          <span className="bar-track">
            <span className="bar" style={{ width: `${(it.ventas / max) * 100}%` }} />
            <span className="bar-value">{fmtCompacto(it.ventas)}</span>
          </span>
          {activo === it.nombre && (
            <span className="tooltip tooltip-inline" aria-hidden="true">
              <strong>{it.nombre}</strong>
              <span>{fmtMXN(it.ventas)}</span>
              <span>
                {fmtPct(it.participacion)} del total · {fmtNum(it.unidades)} uds.
              </span>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
