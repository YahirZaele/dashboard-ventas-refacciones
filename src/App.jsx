import { useEffect, useMemo, useState } from 'react'
import { parseCSV } from './lib/csv'
import { CANALES, limpiarVentas, SIN_CANAL } from './lib/clean'
import { etiquetaMes, filtrar, hallazgos, kpis, PERIODOS, porDimension, rangos, serieTiempo, topProductos, variacion } from './lib/metrics'
import { fmtMXN, fmtNum, fmtPct, fmtVariacion } from './format'
import KpiTile from './components/KpiTile'
import LineChart from './components/LineChart'
import BarList from './components/BarList'
import SegmentedBar from './components/SegmentedBar'
import DataTable from './components/DataTable'
import TopTable from './components/TopTable'
import DataQuality from './components/DataQuality'

const ARCHIVO = `${import.meta.env.BASE_URL}data/ventas_2024_2025.csv`
const FILTROS_INICIALES = { periodo: '12m', canal: 'Todos', categoria: 'Todas' }

function etiquetaRango({ desde, hasta }) {
  return desde === hasta ? etiquetaMes(desde) : `${etiquetaMes(desde)} – ${etiquetaMes(hasta)}`
}

export default function App() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)

  useEffect(() => {
    fetch(ARCHIVO)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((texto) => setDatos(limpiarVentas(parseCSV(texto))))
      .catch((e) => setError(e.message))
  }, [])

  const vista = useMemo(() => {
    if (!datos) return null
    const { filas } = datos
    const ultimoMes = filas.reduce((m, f) => (f.mes > m ? f.mes : m), '')
    const primerMes = filas.reduce((m, f) => (f.mes < m ? f.mes : m), ultimoMes)
    const meses = PERIODOS.find((p) => p.id === filtros.periodo).meses
    const r = rangos(ultimoMes, meses)
    const dims = { canal: filtros.canal, categoria: filtros.categoria }
    const actual = filtrar(filas, { ...r.actual, ...dims })
    const anterior = filtrar(filas, { ...r.anterior, ...dims })
    const kA = kpis(actual)
    const kB = kpis(anterior)
    return {
      r,
      kA,
      vars: {
        ventas: variacion(kA.ventas, kB.ventas),
        pedidos: variacion(kA.pedidos, kB.pedidos),
        ticket: variacion(kA.ticket, kB.ticket),
        devolucion: variacion(kA.devolucion, kB.devolucion),
      },
      serie: serieTiempo(actual, anterior, r.actual, r.anterior),
      categorias: porDimension(actual, 'categoria'),
      canales: porDimension(actual, 'canal'),
      canalesAnt: new Map(porDimension(anterior, 'canal').map((c) => [c.nombre, c.ventas])),
      top: topProductos(actual, 10),
      notas: hallazgos(actual, anterior),
      categoriasDisponibles: [...new Set(filas.map((f) => f.categoria))].sort((a, b) => a.localeCompare(b, 'es')),
      ultimoMes,
      primerMes,
    }
  }, [datos, filtros])

  if (error) {
    return (
      <main className="container state">
        <h1>No se pudieron cargar los datos</h1>
        <p className="muted">Error al leer el archivo de ventas ({error}). Recarga la página para intentar de nuevo.</p>
      </main>
    )
  }
  if (!vista) {
    return (
      <main className="container state" aria-busy="true">
        <p className="muted">Cargando y limpiando los datos de ventas…</p>
      </main>
    )
  }

  const set = (k) => (e) => setFiltros((f) => ({ ...f, [k]: e.target.value }))
  const { r, kA, vars } = vista
  const lblActual = etiquetaRango(r.actual)
  const lblAnterior = etiquetaRango(r.anterior)
  const sinDatos = kA.pedidos === 0

  return (
    <>
      <div className="demo-banner" role="note">
        Proyecto de portafolio: los datos son ficticios y se generaron con un script de Python.
      </div>
      <header className="container header">
        <div>
          <p className="eyebrow">Ruta 150 Refacciones</p>
          <h1>Tablero de ventas</h1>
          <p className="muted">
            Datos de {etiquetaMes(vista.primerMes)} a {etiquetaMes(vista.ultimoMes)} · Periodo: <strong>{lblActual}</strong>, comparado con {lblAnterior}
          </p>
        </div>
      </header>

      <main className="container">
        <section className="filters" aria-label="Filtros">
          <fieldset className="periods">
            <legend>Periodo</legend>
            {PERIODOS.map((p) => (
              <label key={p.id} className={filtros.periodo === p.id ? 'on' : ''}>
                <input type="radio" name="periodo" value={p.id} checked={filtros.periodo === p.id} onChange={set('periodo')} />
                {p.label}
              </label>
            ))}
          </fieldset>
          <label>
            Canal
            <select value={filtros.canal} onChange={set('canal')}>
              <option>Todos</option>
              {[...CANALES, SIN_CANAL].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Categoría
            <select value={filtros.categoria} onChange={set('categoria')}>
              <option>Todas</option>
              {vista.categoriasDisponibles.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-link" onClick={() => setFiltros(FILTROS_INICIALES)}>
            Restablecer
          </button>
        </section>

        {sinDatos ? (
          <p className="card state">No hay ventas con esta combinación de filtros.</p>
        ) : (
          <>
            <section className="tiles" aria-label="Indicadores principales">
              <KpiTile hero label="Ventas netas" value={fmtMXN(kA.ventas)} variacion={vars.ventas} />
              <KpiTile label="Pedidos entregados" value={fmtNum(kA.pedidos)} variacion={vars.pedidos} />
              <KpiTile label="Ticket promedio" value={fmtMXN(kA.ticket)} variacion={vars.ticket} />
              <KpiTile label="Tasa de devolución" value={fmtPct(kA.devolucion)} variacion={vars.devolucion} subirEsBueno={false} />
            </section>

            {vista.notas.length > 0 && (
              <section className="card insights" aria-label="Hallazgos">
                <h2>Hallazgos del periodo</h2>
                <ul>
                  {vista.notas.map((n) => (
                    <li key={n.tipo}>
                      {n.tipo === 'canal' && (
                        <>
                          <strong>{n.nombre}</strong> es el canal que más creció: {fmtVariacion(n.valor)} contra {lblAnterior}.
                        </>
                      )}
                      {n.tipo === 'categoria' && (
                        <>
                          <strong>{n.nombre}</strong> es la categoría con más ventas: {fmtPct(n.valor)} del total.
                        </>
                      )}
                      {n.tipo === 'producto' && (
                        <>
                          El producto que más ingresos dejó fue <strong>{n.nombre}</strong> ({fmtNum(n.valor)} unidades).
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="card">
              <h2>Ventas netas {r.actual.desde === r.actual.hasta ? 'por día' : 'por mes'}</h2>
              <LineChart data={vista.serie} labelActual={lblActual} labelAnterior={lblAnterior} />
              <DataTable
                caption="Ventas netas por periodo"
                rows={vista.serie}
                columns={[
                  { key: 'detalle', label: 'Periodo' },
                  { key: 'actual', label: lblActual, num: true, format: (v) => (v == null ? '—' : fmtMXN(v)) },
                  { key: 'anterior', label: lblAnterior, num: true, format: (v) => (v == null ? '—' : fmtMXN(v)) },
                ]}
              />
            </section>

            <div className="grid-2">
              <section className="card">
                <h2>Ventas por categoría</h2>
                <BarList items={vista.categorias} />
                <DataTable
                  caption="Ventas por categoría"
                  rows={vista.categorias}
                  columns={[
                    { key: 'nombre', label: 'Categoría' },
                    { key: 'unidades', label: 'Unidades', num: true, format: fmtNum },
                    { key: 'ventas', label: 'Ventas', num: true, format: fmtMXN },
                    { key: 'participacion', label: '%', num: true, format: (v) => fmtPct(v) },
                  ]}
                />
              </section>
              <section className="card">
                <h2>Participación por canal</h2>
                <SegmentedBar items={vista.canales} />
                <table className="canal-table">
                  <caption className="sr-only">Ventas por canal contra el periodo anterior</caption>
                  <thead>
                    <tr>
                      <th scope="col">Canal</th>
                      <th scope="col" className="num">Ventas</th>
                      <th scope="col" className="num">vs {lblAnterior}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vista.canales.map((c) => {
                      const v = variacion(c.ventas, vista.canalesAnt.get(c.nombre))
                      return (
                        <tr key={c.nombre}>
                          <td>{c.nombre}</td>
                          <td className="num">{fmtMXN(c.ventas)}</td>
                          <td className={`num delta ${v == null ? '' : v >= 0 ? 'good' : 'bad'}`}>
                            {v != null && <span aria-hidden="true">{v >= 0 ? '▲ ' : '▼ '}</span>}
                            {fmtVariacion(v)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            </div>

            <section className="card">
              <h2>Top 10 productos</h2>
              <TopTable rows={vista.top} nombreArchivo={`top_productos_${r.actual.desde}_${r.actual.hasta}.csv`} />
            </section>
          </>
        )}

        <section className="card">
          <h2>Calidad de datos</h2>
          <DataQuality reporte={datos.reporte} />
        </section>
      </main>

      <footer className="container footer">
        <p>
          Proyecto de portafolio de{' '}
          <a href="https://github.com/YahirZaele" target="_blank" rel="noreferrer">
            Yahir Zaele Medina Rioja
          </a>
          . Las ventas corresponden a la tienda demo{' '}
          <a href="https://yahirzaele.github.io/tienda-refacciones-moto/" target="_blank" rel="noreferrer">
            Ruta 150 Refacciones
          </a>
          , también ficticia. Hecho con React, Vite y gráficas SVG propias.
        </p>
      </footer>
    </>
  )
}
