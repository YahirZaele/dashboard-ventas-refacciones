import { useState } from 'react'
import useWidth from './useWidth'
import { fmtCompacto, fmtMXN, maximoEje } from '../format'

// Gráfica de línea en SVG: periodo actual vs periodo anterior, con cruz y tooltip al pasar
// el cursor (o con las flechas del teclado cuando la gráfica tiene el foco).
const ALTO = 280
const M = { t: 16, r: 20, b: 30, l: 64 }

export default function LineChart({ data, labelActual, labelAnterior }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const w = Math.max(width, 280)
  const iw = w - M.l - M.r
  const ih = ALTO - M.t - M.b
  const n = data.length

  const valores = data.flatMap((d) => [d.actual, d.anterior]).filter((v) => v != null)
  const { max, paso } = maximoEje(Math.max(...valores, 1))
  const marcas = Array.from({ length: Math.round(max / paso) + 1 }, (_, i) => i * paso)
  const usarCompacto = max >= 10000

  const x = (i) => M.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1))
  const y = (v) => M.t + ih - (v / max) * ih

  const linea = (key) =>
    data
      .map((d, i) => (d[key] == null ? null : `${x(i)},${y(d[key])}`))
      .filter(Boolean)
      .map((p, i) => (i === 0 ? `M${p}` : `L${p}`))
      .join('')
  const ultimo = data.reduce((acc, d, i) => (d.actual != null ? i : acc), 0)
  const area = `${linea('actual')}L${x(ultimo)},${y(0)}L${x(0)},${y(0)}Z`

  const cada = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 52))))

  function mover(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = n === 1 ? 0 : Math.round(((px - M.l) / iw) * (n - 1))
    setHover(Math.min(n - 1, Math.max(0, i)))
  }
  function teclado(e) {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1))
    else if (e.key === 'Escape') setHover(null)
    else return
    e.preventDefault()
  }

  const d = hover != null ? data[hover] : null
  const tipLeft = hover != null ? Math.min(Math.max(x(hover), 90), w - 90) : 0

  return (
    <div className="chart" ref={ref}>
      <ul className="legend" aria-hidden="true">
        <li>
          <span className="key-line key-actual" /> {labelActual}
        </li>
        <li>
          <span className="key-line key-anterior" /> {labelAnterior}
        </li>
      </ul>
      <div className="chart-plot">
        <svg
          width={w}
          height={ALTO}
          role="img"
          aria-label={`Ventas netas: ${labelActual} contra ${labelAnterior}. Usa las flechas para recorrer los puntos.`}
          tabIndex={0}
          onPointerMove={mover}
          onPointerLeave={() => setHover(null)}
          onKeyDown={teclado}
          onBlur={() => setHover(null)}
        >
          {marcas.map((v) => (
            <g key={v}>
              <line className={v === 0 ? 'axis' : 'grid'} x1={M.l} x2={w - M.r} y1={y(v)} y2={y(v)} />
              <text className="tick" x={M.l - 8} y={y(v)} dy="0.32em" textAnchor="end">
                {usarCompacto ? fmtCompacto(v) : fmtMXN(v)}
              </text>
            </g>
          ))}
          {data.map((p, i) =>
            i % cada === 0 || i === n - 1 ? (
              <text key={i} className="tick" x={x(i)} y={ALTO - 8} textAnchor={i === n - 1 && n > 1 ? 'end' : i === 0 && n > 1 ? 'start' : 'middle'}>
                {p.etiqueta}
              </text>
            ) : null,
          )}
          <path className="area-actual" d={area} />
          <path className="line-anterior" d={linea('anterior')} />
          <path className="line-actual" d={linea('actual')} />
          {hover == null && data[ultimo]?.actual != null && (
            <circle className="dot-actual" cx={x(ultimo)} cy={y(data[ultimo].actual)} r="4.5" />
          )}
          {d && (
            <g>
              <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + ih} />
              {d.anterior != null && <circle className="dot-anterior" cx={x(hover)} cy={y(d.anterior)} r="4.5" />}
              {d.actual != null && <circle className="dot-actual" cx={x(hover)} cy={y(d.actual)} r="5" />}
            </g>
          )}
        </svg>
        {d && (
          <div className="tooltip" style={{ left: tipLeft, top: 4 }} role="status">
            <strong>{d.detalle}</strong>
            <span>
              <i className="key-line key-actual" /> {d.actual != null ? fmtMXN(d.actual) : '—'}
            </span>
            <span>
              <i className="key-line key-anterior" /> {d.detalleAnterior ? `${d.detalleAnterior}: ` : 'Anterior: '}
              {d.anterior != null ? fmtMXN(d.anterior) : '—'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
