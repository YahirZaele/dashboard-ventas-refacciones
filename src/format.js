const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const entero = new Intl.NumberFormat('es-MX')

export const fmtMXN = (n) => mxn.format(n)
export const fmtNum = (n) => entero.format(n)
export const fmtPct = (n, dec = 1) => `${(n * 100).toFixed(dec)} %`

// Formato compacto para cifras grandes: $1.2 M, $845 mil, $950.
export function fmtCompacto(n) {
  const abs = Math.abs(n)
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(abs >= 1e7 ? 1 : 2)} M`
  if (abs >= 1e4) return `$${Math.round(n / 1e3)} mil`
  if (abs >= 1e3) return `$${Number((n / 1e3).toFixed(1))} mil`
  return fmtMXN(n)
}

export function fmtVariacion(v) {
  if (v == null) return 'sin dato previo'
  const signo = v > 0 ? '+' : v < 0 ? '−' : ''
  return `${signo}${Math.abs(v * 100).toFixed(1)} %`
}

// Máximo "redondo" del eje para que las marcas queden en números limpios.
export function maximoEje(max, marcas = 4) {
  if (max <= 0) return { max: marcas, paso: 1 }
  const bruto = max / marcas
  const mag = 10 ** Math.floor(Math.log10(bruto))
  const paso = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((p) => p >= bruto)
  return { max: paso * marcas, paso }
}
