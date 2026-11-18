import { fmtNum, fmtPct } from '../format'

// Reporte de calidad de datos: qué se corrigió o descartó del export crudo antes de calcular.
export default function DataQuality({ reporte }) {
  const r = reporte
  const reglas = [
    { icono: '✕', tono: 'bad', accion: 'Eliminadas', n: r.duplicadas, texto: 'Filas duplicadas (el export repite renglones completos).' },
    { icono: '✕', tono: 'bad', accion: 'Descartadas', n: r.cantidadesInvalidas, texto: 'Cantidad en 0 o negativa.' },
    { icono: '✕', tono: 'bad', accion: 'Descartadas', n: r.fechasInvalidas + r.preciosSinRecuperar, texto: 'Fecha ilegible o precio imposible de recuperar.' },
    { icono: '✎', tono: 'fixed', accion: 'Corregidas', n: r.fechasConvertidas, texto: 'Fechas en formato DD/MM/AAAA convertidas a AAAA-MM-DD.' },
    { icono: '✎', tono: 'fixed', accion: 'Corregidas', n: r.canalesNormalizados, texto: 'Canal escrito de otra forma ("whatsapp", "WEB", espacios) unificado.' },
    { icono: '✎', tono: 'fixed', accion: 'Corregidas', n: r.preciosRecuperados, texto: 'Precio vacío recuperado con el precio más frecuente del mismo SKU y año.' },
    { icono: '!', tono: 'warn', accion: 'Marcadas', n: r.canalesVacios, texto: 'Sin canal: se conservan como "No registrado" para no perder la venta.' },
  ]
  const descartadas = r.filasLeidas - r.filasValidas
  return (
    <div>
      <p className="dq-summary">
        Se leyeron <strong>{fmtNum(r.filasLeidas)}</strong> filas del export y quedaron <strong>{fmtNum(r.filasValidas)}</strong> válidas
        ({fmtPct(r.filasValidas / r.filasLeidas)}). Se descartaron {fmtNum(descartadas)} y se corrigieron{' '}
        {fmtNum(r.fechasConvertidas + r.canalesNormalizados + r.preciosRecuperados)}.
      </p>
      <ul className="dq-list">
        {reglas.map((g) => (
          <li key={g.texto}>
            <span className={`dq-icon ${g.tono}`} aria-hidden="true">
              {g.icono}
            </span>
            <span className="dq-count">{fmtNum(g.n)}</span>
            <span>
              <strong>{g.accion}:</strong> {g.texto}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
