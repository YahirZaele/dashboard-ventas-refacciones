-- Consultas equivalentes a los indicadores del tablero (sintaxis SQLite).
-- Suponen que el CSV ya se limpió y se cargó en la tabla ventas_limpias
-- con las mismas reglas de src/lib/clean.js.

CREATE TABLE IF NOT EXISTS ventas_limpias (
  folio           TEXT    NOT NULL,
  fecha           TEXT    NOT NULL,   -- AAAA-MM-DD
  mes             TEXT    NOT NULL,   -- AAAA-MM
  canal           TEXT    NOT NULL,   -- Mostrador | Tienda en línea | WhatsApp | No registrado
  sku             TEXT    NOT NULL,
  producto        TEXT    NOT NULL,
  categoria       TEXT    NOT NULL,
  cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
  precio          REAL    NOT NULL CHECK (precio > 0),
  descuento       REAL    NOT NULL DEFAULT 0,
  estatus         TEXT    NOT NULL,   -- Entregado | Devuelto | Cancelado
  importe         REAL    NOT NULL    -- cantidad * precio * (1 - descuento / 100)
);

-- 1) KPIs del periodo (ejemplo: últimos 12 meses = 2025)
SELECT
  ROUND(SUM(CASE WHEN estatus = 'Entregado' THEN importe END), 2)            AS ventas_netas,
  COUNT(DISTINCT CASE WHEN estatus = 'Entregado' THEN folio END)             AS pedidos,
  ROUND(SUM(CASE WHEN estatus = 'Entregado' THEN importe END)
        / COUNT(DISTINCT CASE WHEN estatus = 'Entregado' THEN folio END), 2) AS ticket_promedio,
  ROUND(1.0 * COUNT(DISTINCT CASE WHEN estatus = 'Devuelto' THEN folio END)
        / COUNT(DISTINCT CASE WHEN estatus IN ('Entregado', 'Devuelto') THEN folio END), 4) AS tasa_devolucion
FROM ventas_limpias
WHERE mes BETWEEN '2025-01' AND '2025-12';

-- 2) Ventas por mes: periodo actual contra el mismo mes del periodo anterior
WITH mensual AS (
  SELECT mes, SUM(importe) AS ventas
  FROM ventas_limpias
  WHERE estatus = 'Entregado'
  GROUP BY mes
)
SELECT
  a.mes,
  ROUND(a.ventas, 2)                                    AS ventas,
  ROUND(b.ventas, 2)                                    AS ventas_anio_anterior,
  ROUND((a.ventas - b.ventas) / b.ventas * 100, 1)      AS variacion_pct
FROM mensual a
LEFT JOIN mensual b
  ON b.mes = printf('%04d-%s', CAST(substr(a.mes, 1, 4) AS INTEGER) - 1, substr(a.mes, 6, 2))
WHERE a.mes BETWEEN '2025-01' AND '2025-12'
ORDER BY a.mes;

-- 3) Participación por canal (con función de ventana)
SELECT
  canal,
  ROUND(SUM(importe), 2)                                           AS ventas,
  ROUND(SUM(importe) * 100.0 / SUM(SUM(importe)) OVER (), 1)       AS participacion_pct
FROM ventas_limpias
WHERE estatus = 'Entregado' AND mes BETWEEN '2025-01' AND '2025-12'
GROUP BY canal
ORDER BY ventas DESC;

-- 4) Top 10 productos por ventas netas
SELECT
  sku,
  producto,
  categoria,
  SUM(cantidad)              AS unidades,
  ROUND(SUM(importe), 2)     AS ventas
FROM ventas_limpias
WHERE estatus = 'Entregado' AND mes BETWEEN '2025-01' AND '2025-12'
GROUP BY sku, producto, categoria
ORDER BY ventas DESC
LIMIT 10;

-- 5) Control de calidad sobre la tabla cruda (antes de limpiar):
--    duplicados exactos que el export repite.
-- SELECT folio, fecha, sku, COUNT(*) AS veces
-- FROM ventas_crudas
-- GROUP BY folio, fecha, canal, sku, producto, categoria, cantidad, precio_unitario, descuento_pct, estatus
-- HAVING COUNT(*) > 1;
