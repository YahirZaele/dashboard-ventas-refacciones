// Lector de CSV mínimo (RFC 4180): soporta comillas, comas y saltos de línea dentro de comillas.
// Devuelve un arreglo de objetos usando la primera fila como encabezados.
export function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const [header, ...data] = rows.filter((r) => !(r.length === 1 && r[0] === ''))
  if (!header) return []
  return data.map((r) => Object.fromEntries(header.map((h, j) => [h, r[j] ?? ''])))
}

// Convierte un arreglo de objetos a texto CSV (para el botón de exportar).
export function toCSV(rows, columns) {
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map((c) => esc(c.label)).join(',')]
  for (const r of rows) lines.push(columns.map((c) => esc(r[c.key])).join(','))
  return lines.join('\n')
}
