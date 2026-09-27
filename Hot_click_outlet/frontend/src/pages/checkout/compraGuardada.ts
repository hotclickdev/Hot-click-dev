import type { PaqueteCompra } from './paquetesCompra'

const CLAVE_COMPRA = 'hotclick-ultima-compra'

export type PaqueteGuardado = { tienda: string; provincia: string | null; cantidad: number; metodoEnvio: string }

/**
 * Lo que las pantallas de resultado muestran del pedido. Queda solo en `sessionStorage` de la pestaña:
 * el estado de pago es público por número de pedido y no debe devolver nombre ni correo.
 */
export type CompraGuardada = {
  nombre: string
  correo: string
  cantidadProductos: number
  total: number
  paquetes: PaqueteGuardado[]
}

type CompraAGuardar = {
  nombre: string
  correo: string
  total: number
  paquetes: PaqueteCompra[]
  envios: Record<string, string>
}

export function guardarCompra({ nombre, correo, total, paquetes, envios }: CompraAGuardar): void {
  const compra: CompraGuardada = {
    nombre: nombre.trim(),
    correo: correo.trim(),
    total,
    cantidadProductos: paquetes.reduce((suma, p) => suma + p.cantidadProductos, 0),
    paquetes: paquetes.map((p) => ({
      tienda: p.nombre,
      provincia: p.provincia,
      cantidad: p.cantidadProductos,
      metodoEnvio: envios[p.clave],
    })),
  }
  try {
    sessionStorage.setItem(CLAVE_COMPRA, JSON.stringify(compra))
  } catch (error) {
    console.warn('No se pudo guardar el resumen de la compra', error)
  }
}

function esCompraGuardada(valor: unknown): valor is CompraGuardada {
  if (!valor || typeof valor !== 'object') return false
  const compra = valor as Record<string, unknown>
  return typeof compra.nombre === 'string' && typeof compra.total === 'number' && Array.isArray(compra.paquetes)
}

export function leerCompra(): CompraGuardada | null {
  try {
    const guardada: unknown = JSON.parse(sessionStorage.getItem(CLAVE_COMPRA) ?? 'null')
    return esCompraGuardada(guardada) ? guardada : null
  } catch (error) {
    console.warn('No se pudo leer el resumen de la compra', error)
    return null
  }
}
