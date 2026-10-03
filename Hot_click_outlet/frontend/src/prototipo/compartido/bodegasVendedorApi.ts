import { warehouseService } from '@/services/orderService'
import type { BodegaEmprendedor } from '@/prototipo/emprendedor/types'
import type { Id } from '@/types/api'
import { normalizarTelefonoBodega } from './nuevaBodegaHelpers'

type BodegaApi = {
  id?: Id
  nombreBodega?: string
  direccionExacta?: string
  encargadoNombre?: string
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
  }
}

export async function cargarBodegasVendedor(): Promise<BodegaEmprendedor[]> {
  const { data } = await warehouseService.getAll()
  return listaBodegas(data).map((bodega, indice) => aBodegaEmprendedor(bodega, indice))
}

export type NuevaBodegaVendedor = Readonly<{
  nombre: string
  ubicacion: string
  /** Valor de PhoneField; se envía normalizado (`+50688881234`). Uso interno: no se publica. */
  telefono: string
  encargado: string
}>

export async function crearBodegaVendedor({ nombre, ubicacion, telefono, encargado }: NuevaBodegaVendedor) {
  await warehouseService.create({
    nombreBodega: nombre.trim(),
    direccionExacta: ubicacion.trim(),
    telefono: normalizarTelefonoBodega(telefono),
    ...(encargado.trim() ? { encargadoNombre: encargado.trim() } : {}),
  })
}
