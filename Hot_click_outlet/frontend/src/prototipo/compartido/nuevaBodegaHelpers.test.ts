import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearBodegaVendedor } from './bodegasVendedorApi'
import {
  ERROR_DATOS_BODEGA,
  ERROR_GUARDAR_BODEGA,
  ERROR_LIMITE_BODEGAS,
  TELEFONO_INVALIDO,
  TELEFONO_OBLIGATORIO,
  mensajeErrorGuardarBodega,
  normalizarTelefonoBodega,
  validarTelefonoBodega,
} from './nuevaBodegaHelpers'

const create = vi.hoisted(() => vi.fn())
vi.mock('@/services/orderService', () => ({
  warehouseService: { create: (body: unknown) => create(body), getAll: vi.fn() },
}))

function errorHttp(status: number, data: unknown) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data } })
}

describe('validarTelefonoBodega', () => {
  it('vacío o solo el prefijo de PhoneField → obligatorio', () => {
    expect(validarTelefonoBodega('')).toBe(TELEFONO_OBLIGATORIO)
    expect(validarTelefonoBodega(undefined)).toBe(TELEFONO_OBLIGATORIO)
    expect(validarTelefonoBodega('+506')).toBe(TELEFONO_OBLIGATORIO)
    expect(validarTelefonoBodega('+506 ')).toBe(TELEFONO_OBLIGATORIO)
  })

  it('Costa Rica: exige exactamente 8 dígitos locales', () => {
    expect(validarTelefonoBodega('+50688881234')).toBeNull()
    expect(validarTelefonoBodega('+506 8888-1234')).toBeNull()
    expect(validarTelefonoBodega('+5068888123')).toBe(TELEFONO_INVALIDO)
    expect(validarTelefonoBodega('+506888812345')).toBe(TELEFONO_INVALIDO)
  })

  it('otro código de país: largo E.164 (8 a 15 dígitos)', () => {
    expect(validarTelefonoBodega('+12025550123')).toBeNull()
    expect(validarTelefonoBodega('+1202')).toBe(TELEFONO_INVALIDO)
    expect(validarTelefonoBodega('+1234567890123456')).toBe(TELEFONO_INVALIDO)
  })
})

describe('normalizarTelefonoBodega', () => {
  it('deja + y dígitos (cabe en la columna de 20)', () => {
    expect(normalizarTelefonoBodega('+506 8888-1234')).toBe('+50688881234')
    expect(normalizarTelefonoBodega('  ')).toBe('')
  })
})

describe('crearBodegaVendedor', () => {
  beforeEach(() => create.mockReset())

  it('manda el teléfono que exige POST /api/bodegas', async () => {
    create.mockResolvedValue({ data: { success: true } })
    await crearBodegaVendedor({
      nombre: ' Bodega Central ',
      ubicacion: ' San José ',
      telefono: '+506 8888-1234',
      encargado: '',
    })
    expect(create).toHaveBeenCalledWith({
      nombreBodega: 'Bodega Central',
      direccionExacta: 'San José',
      telefono: '+50688881234',
    })
  })

  it('incluye el encargado solo si viene', async () => {
    create.mockResolvedValue({ data: { success: true } })
    await crearBodegaVendedor({ nombre: 'B', ubicacion: 'U', telefono: '+50688881234', encargado: ' Sofía ' })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ encargadoNombre: 'Sofía' }))
  })
})

describe('mensajeErrorGuardarBodega', () => {
  it('403 por límite de plan: muestra el motivo del backend', () => {
    const err = errorHttp(403, {
      error: 'LIMIT_REACHED',
      message: 'Has alcanzado el límite de bodegas de tu plan (1/1).',
      upgrade: 'Plan actual: «Emprendedor».',
    })
    expect(mensajeErrorGuardarBodega(err)).toBe('Has alcanzado el límite de bodegas de tu plan (1/1).')
  })

  it('403 por límite sin mensaje: texto propio', () => {
    expect(mensajeErrorGuardarBodega(errorHttp(403, { error: 'LIMIT_REACHED' }))).toBe(ERROR_LIMITE_BODEGAS)
  })

  it('400 de validación conocida: muestra el campo que falta', () => {
    const err = errorHttp(400, { success: false, message: 'El teléfono es obligatorio' })
    expect(mensajeErrorGuardarBodega(err)).toBe('El teléfono es obligatorio.')
    expect(mensajeErrorGuardarBodega(errorHttp(400, { message: 'La dirección es obligatoria' })))
      .toBe('La dirección es obligatoria.')
  })

  it('400 con texto interno (excepción cruda): no lo muestra', () => {
    const err = errorHttp(400, { message: 'could not execute statement; SQL [n/a]; constraint [null]' })
    expect(mensajeErrorGuardarBodega(err)).toBe(ERROR_DATOS_BODEGA)
  })

  it('otro 403, 5xx o error de red: genérico', () => {
    expect(mensajeErrorGuardarBodega(errorHttp(403, { message: 'Acceso denegado' }))).toBe(ERROR_GUARDAR_BODEGA)
    expect(mensajeErrorGuardarBodega(errorHttp(500, { message: 'NullPointerException' }))).toBe(ERROR_GUARDAR_BODEGA)
    expect(mensajeErrorGuardarBodega(new Error('Network Error'))).toBe(ERROR_GUARDAR_BODEGA)
    expect(mensajeErrorGuardarBodega(null)).toBe(ERROR_GUARDAR_BODEGA)
  })
})
