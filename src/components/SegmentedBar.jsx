import { useState } from 'react'
import useWidth from './useWidth'
import { fmtMXN, fmtPct } from '../format'

// Barra segmentada (un total dividido en partes): participación de cada canal.
// El color sigue al canal, no a su posición, para que no cambie al filtrar.
const COLOR_CANAL = {
  Mostrador: 'var(--series-1)',
  'Tienda en línea': 'var(--series-2)',
  WhatsApp: 'var(--series-3)',
  'No registrado': 'var(--muted)',
}

export default function SegmentedBar({ items }) {
  const [ref, width] = useWidth()
  const [activo, setActivo] = useState(null)
  const partes = items.filter((i) => i.ventas > 0)
  const espacio = width - 2 * Math.max(0, partes.length - 1)
  const it = partes.find((p) => p.nombre === activo)

  return (
    <div className="segmented-wrap" ref={ref}>
      <div className="segmented" role="list">
        {partes.map((p) => {
          const etiqueta = fmtPct(p.participacion, 0)
          const cabe = espacio * p.participacion >= etiqueta.length * 8 + 16
          return (
            <div
              key={p.nombre}
              role="listitem"
              tabIndex={0}
              className="segment"
              style={{ flexGrow: p.participacion, background: COLOR_CANAL[p.nombre] ?? 'var(--muted)' }}
              onPointerEnter={() => setActivo(p.nombre)}
              onPointerLeave={() => setActivo(null)}
              onFocus={() => setActivo(p.nombre)}
              onBlur={() => setActivo(null)}
              aria-label={`${p.nombre}: ${fmtPct(p.participacion)} (${fmtMXN(p.ventas)})`}
            >
              {cabe && <span>{etiqueta}</span>}
            </div>
          )
        })}
      </div>
      {it && (
        <div className="tooltip tooltip-static" aria-hidden="true">
          <strong>{it.nombre}</strong> {fmtMXN(it.ventas)} · {fmtPct(it.participacion)}
        </div>
      )}
      <ul className="legend">
        {partes.map((p) => (
          <li key={p.nombre}>
            <span className="swatch" style={{ background: COLOR_CANAL[p.nombre] ?? 'var(--muted)' }} /> {p.nombre}
          </li>
        ))}
      </ul>
    </div>
  )
}
