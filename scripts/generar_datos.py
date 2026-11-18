"""Genera el dataset ficticio de ventas de Ruta 150 Refacciones (2024-2025).

Simula el export "crudo" de un sistema de punto de venta, con los problemas
típicos que hay que limpiar antes de analizar:

- filas duplicadas (el export repite algunos renglones),
- canal escrito de varias formas ("whatsapp", " Mostrador ", "TIENDA EN LINEA") o vacío,
- fechas en formato DD/MM/AAAA en lugar de AAAA-MM-DD,
- cantidades en 0 o negativas,
- precio unitario vacío (se recupera del catálogo por SKU).

Uso:  python scripts/generar_datos.py
Salida: public/data/ventas_2024_2025.csv  (semilla fija: siempre genera lo mismo)
"""

import csv
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 150
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "ventas_2024_2025.csv"

# sku, producto, categoria, precio 2025 (MXN), popularidad relativa
CATALOGO = [
    ("MOT-BUJ-01", "Bujía de iridio", "Motor", 189, 9),
    ("MOT-KIT-02", "Kit de pistón y anillos 150cc", "Motor", 749, 2),
    ("MOT-JUN-03", "Juego de juntas de motor", "Motor", 329, 2),
    ("MOT-CAD-04", "Cadena de distribución", "Motor", 259, 2),
    ("FRE-BAL-05", "Balatas delanteras de disco", "Frenos", 219, 8),
    ("FRE-ZAP-06", "Zapatas de freno trasero", "Frenos", 169, 6),
    ("FRE-DIS-07", "Disco de freno delantero", "Frenos", 689, 1.5),
    ("FRE-LIQ-08", "Líquido de frenos DOT 4 (250 ml)", "Frenos", 99, 5),
    ("TRA-KIT-09", "Kit de arrastre (cadena, piñón y catarina)", "Transmisión", 899, 4),
    ("TRA-KIT-10", "Kit de arrastre reforzado 520", "Transmisión", 1349, 1.5),
    ("TRA-CLU-11", "Cable de clutch", "Transmisión", 129, 4),
    ("TRA-DIS-12", "Discos de clutch (juego)", "Transmisión", 449, 2),
    ("ELE-BAT-13", "Batería de gel 12V 5Ah", "Eléctrico", 699, 3.5),
    ("ELE-BAT-14", "Batería de gel 12V 7Ah", "Eléctrico", 899, 1.5),
    ("ELE-FAR-15", "Faro LED delantero", "Eléctrico", 549, 2),
    ("ELE-DIR-16", "Direccionales LED (par)", "Eléctrico", 229, 3),
    ("LLA-DEL-17", "Llanta delantera 2.75-18", "Llantas", 799, 3),
    ("LLA-TRA-18", "Llanta trasera 90/90-18", "Llantas", 949, 3),
    ("LLA-DEP-19", "Llanta deportiva 140/70-17", "Llantas", 1599, 1),
    ("ACE-MOT-20", "Aceite 4T 20W-50 (1 L)", "Aceites y filtros", 149, 14),
    ("ACE-SIN-21", "Aceite sintético 10W-40 (1 L)", "Aceites y filtros", 249, 5),
    ("ACE-FIL-22", "Filtro de aceite", "Aceites y filtros", 89, 6),
    ("ACE-AIR-23", "Filtro de aire", "Aceites y filtros", 119, 5),
    ("ACC-CAS-24", "Casco abatible certificado", "Accesorios", 1299, 1.5),
    ("ACC-GUA-25", "Guantes de protección", "Accesorios", 349, 2.5),
    ("ACC-CAN-26", "Candado de disco con alarma", "Accesorios", 459, 1.5),
]

CANALES = ["Mostrador", "Tienda en línea", "WhatsApp"]
MEZCLA_CANAL = {2024: [0.52, 0.29, 0.19], 2025: [0.42, 0.34, 0.24]}
# Pedidos promedio por día; 2025 crece por la tienda en línea.
PEDIDOS_DIA = {2024: 4.6, 2025: 5.4}
# Estacionalidad mensual (enero = índice 0).
ESTACIONAL = [0.85, 0.82, 0.95, 1.0, 1.0, 1.08, 1.15, 1.12, 1.1, 1.0, 1.02, 1.25]
LLUVIAS = {6, 7, 8, 9}  # junio-septiembre: más frenos y llantas
VARIANTES_CANAL = {
    "Mostrador": ["mostrador", " Mostrador ", "MOSTRADOR"],
    "Tienda en línea": ["Tienda en linea", "TIENDA EN LINEA", "tienda en línea", "Web"],
    "WhatsApp": ["whatsapp", "Whatsapp", " WhatsApp", "WA"],
}


def poisson(rng, lam):
    # Algoritmo de Knuth: suficiente para lambdas pequeñas.
    limite, k, p = 2.718281828459045 ** -lam, 0, 1.0
    while True:
        p *= rng.random()
        if p <= limite:
            return k
        k += 1


def pesos_producto(mes, anio):
    pesos = []
    for sku, _, cat, _, pop in CATALOGO:
        w = pop
        if mes in LLUVIAS and cat in ("Frenos", "Llantas"):
            w *= 1.5
        if mes == 12 and cat == "Accesorios":
            w *= 2.2
        if anio == 2025 and sku == "TRA-DIS-12" and mes >= 10:
            w *= 0.15  # se agotó en la tienda en el último trimestre de 2025
        pesos.append(w)
    return pesos


def generar():
    rng = random.Random(SEED)
    filas = []
    folio = 10000
    dia = date(2024, 1, 1)
    while dia <= date(2025, 12, 31):
        anio, mes = dia.year, dia.month
        lam = PEDIDOS_DIA[anio] * ESTACIONAL[mes - 1] * (0.6 if dia.weekday() == 6 else 1.0)
        for _ in range(poisson(rng, lam)):
            folio += 1
            canal = rng.choices(CANALES, MEZCLA_CANAL[anio])[0]
            r = rng.random()
            estatus = "Entregado" if r < 0.93 else ("Devuelto" if r < 0.97 else "Cancelado")
            n_lineas = rng.choices([1, 2, 3], [0.6, 0.3, 0.1])[0]
            productos = rng.choices(CATALOGO, pesos_producto(mes, anio), k=n_lineas)
            vistos = set()
            for sku, nombre, cat, precio25, _ in productos:
                if sku in vistos:
                    continue
                vistos.add(sku)
                precio = precio25 if anio == 2025 else round(precio25 / 1.06)
                cantidad = rng.choices([1, 2, 3, 4], [0.7, 0.2, 0.07, 0.03])[0]
                if cat == "Aceites y filtros" and rng.random() < 0.3:
                    cantidad += 1
                descuento = rng.choices([0, 5, 10], [0.82, 0.12, 0.06])[0]
                filas.append({
                    "folio": f"R150-{folio}",
                    "fecha": dia.isoformat(),
                    "canal": canal,
                    "sku": sku,
                    "producto": nombre,
                    "categoria": cat,
                    "cantidad": cantidad,
                    "precio_unitario": precio,
                    "descuento_pct": descuento,
                    "estatus": estatus,
                })
        dia += timedelta(days=1)
    return rng, filas


def ensuciar(rng, filas):
    """Introduce los errores típicos de un export real (ver docstring)."""
    for f in filas:
        r = rng.random()
        if r < 0.012:
            f["canal"] = rng.choice(VARIANTES_CANAL[f["canal"]])
        elif r < 0.016:
            f["canal"] = ""
        if rng.random() < 0.009:
            y, m, d = f["fecha"].split("-")
            f["fecha"] = f"{d}/{m}/{y}"
        if rng.random() < 0.003:
            f["cantidad"] = rng.choice([0, -1])
        if rng.random() < 0.005:
            f["precio_unitario"] = ""
    duplicados = rng.sample(filas, k=int(len(filas) * 0.015))
    for d in duplicados:
        filas.insert(rng.randrange(len(filas)), dict(d))
    return filas


def main():
    rng, filas = generar()
    filas = ensuciar(rng, filas)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)
    print(f"{len(filas)} filas -> {OUT}")


if __name__ == "__main__":
    main()
