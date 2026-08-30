import { cuponService } from '@/services/cuponService'

type CuponValidacion = {
  data?: { descuento?: number; codigo?: string }
  descuento?: number
  codigo?: string
}

type ValidarCuponDeps = {
  cuponInput: string
  setCuponEstado: (estado: string) => void
  setCuponError: (error: string) => void
  setCuponDescuento: (descuento: number) => void
  setCuponCodigo: (codigo: string | null) => void
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

/**
 * Valida un cupón — mismo orden de setState que el original.
 */
export async function ejecutarValidarCupon({
  cuponInput, setCuponEstado, setCuponError, setCuponDescuento, setCuponCodigo,
}: ValidarCuponDeps) {
  if (!cuponInput.trim()) return
  setCuponEstado('loading')
  setCuponError('')
  try {
    const { data } = await cuponService.validar(cuponInput.trim())
    const resultado = data as CuponValidacion
    const pct = resultado?.data?.descuento ?? resultado?.descuento ?? 0
    const cod = resultado?.data?.codigo ?? resultado?.codigo ?? cuponInput.trim().toUpperCase()
    setCuponDescuento(pct)
    setCuponCodigo(cod)
    setCuponEstado('valid')
  } catch (err: unknown) {
    const msg = mensajeErrorCupon(err)
    setCuponDescuento(0)
    setCuponCodigo(null)
    setCuponError(msg)
    setCuponEstado('invalid')
  }
}
