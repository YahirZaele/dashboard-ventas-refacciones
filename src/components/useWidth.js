import { useEffect, useRef, useState } from 'react'

// Mide el ancho de un contenedor para que las gráficas SVG se dibujen al tamaño real
// (el texto no se escala como pasaría con un viewBox fijo).
export default function useWidth(inicial = 640) {
  const ref = useRef(null)
  const [width, setWidth] = useState(inicial)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}
