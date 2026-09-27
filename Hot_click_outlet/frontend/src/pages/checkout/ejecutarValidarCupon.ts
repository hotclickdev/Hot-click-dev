import { cuponService } from '@/services/cuponService'
import type { CuponCarrito } from '@/types/carrito'

type DatosCupon = { descuento?: number; codigo?: string; empresaId?: number | null }

type CuponValidacion = DatosCupon & { data?: DatosCupon }

type ValidarCuponDeps = {
  cuponInput: string
  setCuponEstado: (estado: string) => void
  setCuponError: (error: string) => void
  setCupon: (cupon: CuponCarrito | null) => void
}

function mensajeErrorCupon(err: unknown): string {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return 'Código inválido o no disponible'
  }
  const data = (err as { response?: { data?: { message?: unknown; error?: unknown } } }).response?.data
  if (typeof data?.message === 'string') return data.message
  if (typeof data?.error === 'string') return data.error
  return 'Código inválido o no disponible'
}

/** Valida un cupón y lo deja en el carrito con el negocio al que pertenece. */
export async function ejecutarValidarCupon({
  cuponInput, setCuponEstado, setCuponError, setCupon,
}: ValidarCuponDeps) {
  if (!cuponInput.trim()) return
  setCuponEstado('loading')
  setCuponError('')
  try {
    const { data } = await cuponService.validar(cuponInput.trim())
    const resultado = data as CuponValidacion
    const datos = resultado?.data ?? resultado
    setCupon({
      codigo: datos?.codigo ?? cuponInput.trim().toUpperCase(),
      descuento: datos?.descuento ?? 0,
      empresaId: datos?.empresaId ?? null,
    })
    setCuponEstado('valid')
  } catch (err: unknown) {
    setCupon(null)
    setCuponError(mensajeErrorCupon(err))
    setCuponEstado('invalid')
  }
}
