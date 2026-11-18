import { fmtVariacion } from '../format'

// Indicador con variación contra el periodo anterior.
// "subirEsBueno" decide el color: en la tasa de devolución, subir es malo.
export default function KpiTile({ label, value, variacion, subirEsBueno = true, hero = false }) {
  let tono = 'neutral'
  let flecha = ''
  if (variacion != null && Math.abs(variacion) >= 0.0005) {
    const bueno = variacion > 0 === subirEsBueno
    tono = bueno ? 'good' : 'bad'
    flecha = variacion > 0 ? '▲' : '▼'
  }
  return (
    <div className={`tile ${hero ? 'tile-hero' : ''}`}>
      <p className="tile-label">{label}</p>
      <p className="tile-value">{value}</p>
      <p className={`tile-delta ${tono}`}>
        {flecha && <span aria-hidden="true">{flecha} </span>}
        {fmtVariacion(variacion)}
        <span className="muted"> vs periodo anterior</span>
        {tono !== 'neutral' && <span className="sr-only">{tono === 'good' ? ' (favorable)' : ' (desfavorable)'}</span>}
      </p>
    </div>
  )
}
