import { warehouseService } from '@/services/orderService'
import type { BodegaEmprendedor } from '@/prototipo/emprendedor/types'
import type { Id } from '@/types/api'
import { payloadCrearBodega, type FormBodega } from './nuevaBodegaHelpers'
import { aEstadoUbicacionDespacho, type EstadoUbicacionDespacho } from './ubicacionDespachoEstado'

type BodegaApi = {
  id?: Id
  nombreBodega?: string
  direccionExacta?: string
  encargadoNombre?: string
  telefono?: string
  latitud?: number | string | null
  longitud?: number | string | null
}

function numeroMapa(valor: number | string | null | undefined): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim()) {
    const n = Number(valor)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function listaBodegas(data: unknown): BodegaApi[] {
  const wrapped = data as { data?: unknown } | null
  const raw = wrapped?.data ?? data
  if (Array.isArray(raw)) return raw as BodegaApi[]
  const pagina = raw as { content?: BodegaApi[] } | null
  return pagina?.content ?? []
}

export function aBodegaEmprendedor(b: BodegaApi, indice: number): BodegaEmprendedor {
  return {
    id: String(b.id ?? indice),
    nombre: b.nombreBodega ?? 'Bodega',
    ubicacion: b.direccionExacta ?? '',
    productos: 0,
    principal: indice === 0,
    latitud: numeroMapa(b.latitud),
    longitud: numeroMapa(b.longitud),
  }
}

export async function cargarBodegasVendedor(): Promise<BodegaEmprendedor[]> {
  const { data } = await warehouseService.getAll()
  return listaBodegas(data).map((bodega, indice) => aBodegaEmprendedor(bodega, indice))
}

export async function crearBodegaVendedor(form: FormBodega) {
  await warehouseService.create(payloadCrearBodega(form))
}

export async function guardarPinBodega(id: string, latitud: number, longitud: number) {
  await warehouseService.update(id, { latitud: String(latitud), longitud: String(longitud) })
}

export async function cargarEstadoUbicacionDespacho(): Promise<EstadoUbicacionDespacho> {
  const { data } = await warehouseService.getUbicacionDespacho()
  return aEstadoUbicacionDespacho(data)
}
