# Tablero de ventas · Ruta 150 Refacciones (demo)

Dashboard de ventas de una tienda de refacciones para moto **ficticia**, hecho como proyecto de portafolio.
Los datos (2024-2025) se generan con un script de Python e imitan el export "sucio" de un punto de venta,
así que el tablero primero **limpia y valida** los datos y después calcula los indicadores.

**Demo en vivo:** https://yahirzaele.github.io/dashboard-ventas-refacciones/

Es el complemento de la tienda demo [Ruta 150 Refacciones](https://yahirzaele.github.io/tienda-refacciones-moto/).

## Qué muestra

- **KPIs con variación** contra el periodo anterior de la misma duración: ventas netas, pedidos entregados,
  ticket promedio y tasa de devolución (en esta, bajar es lo bueno y así se colorea).
- **Hallazgos automáticos**: el canal que más creció, la categoría líder y el producto que más ingresos dejó.
- **Tendencia** de ventas por mes (o por día, en el filtro "Último mes") contra el periodo anterior, con tooltip
  al pasar el cursor y navegación con las flechas del teclado.
- **Ventas por categoría** y **participación por canal** (mostrador, tienda en línea, WhatsApp).
- **Top 10 productos** con columnas ordenables y **descarga a CSV**.
- **Reporte de calidad de datos**: cuántas filas se eliminaron, descartaron o corrigieron, y por qué.
- Filtros por periodo, canal y categoría; modo claro y oscuro; diseño responsivo.
- Cada gráfica tiene su **vista de tabla**, para no depender solo del color.

## Limpieza de datos

`scripts/generar_datos.py` introduce a propósito los problemas típicos de un export real.
`src/lib/clean.js` los detecta y los resuelve así:

| Problema en el export | Regla aplicada |
|---|---|
| Filas duplicadas | Se eliminan los duplicados exactos |
| Canal escrito de varias formas (`whatsapp`, `WEB`, espacios) | Se unifica al nombre oficial |
| Canal vacío | Se conserva como "No registrado" para no perder la venta |
| Fechas `DD/MM/AAAA` | Se convierten a `AAAA-MM-DD` y se validan (no acepta 31/02) |
| Cantidad en 0 o negativa | Se descarta la fila |
| Precio unitario vacío | Se recupera con el precio más frecuente del mismo SKU en ese año |

## Tecnologías

- **Python** para generar el dataset (semilla fija, reproducible)
- **React 19 + Vite**
- **Gráficas en SVG hechas a mano**, sin librerías: escalas, ejes, tooltip y accesibilidad propios
- **SQL**: `sql/consultas.sql` tiene las mismas métricas en SQL (agregaciones condicionales, CTE,
  `LEFT JOIN` contra el año anterior y funciones de ventana)
- **Vitest** para las pruebas de lectura del CSV, limpieza y métricas
- **GitHub Actions**: lint, pruebas, build y despliegue a GitHub Pages en cada push a `main`

## Decisiones técnicas

- **Lógica separada de la vista:** la limpieza (`clean.js`) y los indicadores (`metrics.js`) son funciones puras,
  sin React. Por eso se pueden probar con Vitest y traducir uno a uno a SQL.
- **Definiciones explícitas:** "ventas netas" solo cuenta pedidos entregados, con descuento aplicado. La tasa de
  devolución excluye cancelados. Las mismas definiciones están en el código, en el SQL y en este README.
- **Comparación justa:** cada periodo se compara contra el periodo inmediato anterior de la misma duración.
- **Color con propósito:** cada canal tiene siempre el mismo color aunque cambien los filtros. La paleta se validó
  para daltonismo, y las variaciones llevan flecha y texto además del color.

## Correr en local

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # pruebas
npm run build     # build de producción en dist/
npm run datos     # vuelve a generar el CSV (requiere Python 3)
```

## Estructura

```
scripts/generar_datos.py   genera public/data/ventas_2024_2025.csv
sql/consultas.sql          los indicadores en SQL
src/
  lib/         csv.js (lector), clean.js (limpieza), metrics.js (indicadores) y sus pruebas
  components/  KpiTile, LineChart, BarList, SegmentedBar, TopTable, DataQuality, DataTable
  App.jsx      filtros y armado del tablero
```

---

Hecho por [Yahir Zaele Medina Rioja](https://github.com/YahirZaele).
