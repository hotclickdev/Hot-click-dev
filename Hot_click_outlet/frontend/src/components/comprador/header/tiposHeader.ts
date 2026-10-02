import type { ReactNode } from 'react'

/**
 * Cromo superior móvil según el tipo de pantalla de Figma.
 * - `global`: logo + acciones + buscador + chips (Home, `7:3`).
 * - `interno`: barra propia con flecha atrás y título (`28:1144`, `27:941`).
 * - `marca`: solo el logo (404 `45:2198`, pago exitoso `29:1932`).
 * - `propio`: sin barra superior; la pantalla dibuja la suya (Categorías `43:1454`).
 */
export type EncabezadoMovil = 'global' | 'interno' | 'marca' | 'propio'

/**
 * Header desktop.
 * - `completo`: buscador híbrido + fila de categorías (Home `9:172`, ficha `29:2072`).
 * - `compacto`: logo, buscador simple y accesos, sin categorías (cuenta `30:1480`, alto 79).
 * - `carrito`: el compacto con la fila en y18 (carrito `30:2269`, alto 83).
 * - `minimo`: logo + "Compra segura" (checkout `30:2386`).
 */
export type EncabezadoEscritorio = 'completo' | 'compacto' | 'carrito' | 'minimo'

/** Destino del botón atrás: una ruta fija o una función. Sin valor: historial del navegador. */
export type DestinoAtras = string | (() => void)

export type DatosBarraInterna = {
  titulo: string
  atras?: DestinoAtras
  /** Contenido a la derecha del título (por ejemplo el contador "3 de 10" de Descubrí). */
  acciones?: ReactNode
}
