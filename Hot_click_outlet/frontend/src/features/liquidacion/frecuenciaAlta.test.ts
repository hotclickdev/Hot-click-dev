import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import api from '@/services/api'
import { consolaService } from '@/pages/plataforma/consola'
import SelectorFrecuencia, { ERROR_FRECUENCIA_OBLIGATORIA } from './SelectorFrecuencia'
import type { Frecuencia } from './frecuenciaApi'
import {
  CAMPO_FRECUENCIA_ALTA, conFrecuenciaAlta, errorFrecuenciaAlta, esErrorFrecuenciaAlta,
} from './frecuenciaAlta'

const fuente = (ruta: string) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8')

afterEach(() => { vi.restoreAllMocks() })

describe('frecuencia de liquidación obligatoria en el alta del negocio (#197)', () => {
  it('sin elegir no se puede enviar: muestra el aviso y no arma el cuerpo', () => {
    expect(ERROR_FRECUENCIA_OBLIGATORIA).toBe('Elegí si querés liquidación quincenal o mensual.')
    expect(errorFrecuenciaAlta(null)).toBe(ERROR_FRECUENCIA_OBLIGATORIA)
    expect(errorFrecuenciaAlta(undefined)).toBe(ERROR_FRECUENCIA_OBLIGATORIA)
    expect(errorFrecuenciaAlta('' as unknown as Frecuencia)).toBe(ERROR_FRECUENCIA_OBLIGATORIA)
    expect(() => conFrecuenciaAlta({ nombreEmpresa: 'Mi Tienda' }, null)).toThrow()
    expect(() => conFrecuenciaAlta({ nombreEmpresa: 'Mi Tienda' }, '' as unknown as Frecuencia)).toThrow()
    expect(() => conFrecuenciaAlta({ nombreEmpresa: 'Mi Tienda' }, 'SEMANAL' as unknown as Frecuencia)).toThrow()
  })

  it('con elección el cuerpo lleva frecuenciaLiquidacion', () => {
    expect(CAMPO_FRECUENCIA_ALTA).toBe('frecuenciaLiquidacion')
    expect(errorFrecuenciaAlta('QUINCENAL')).toBeNull()
    expect(conFrecuenciaAlta({ nombreEmpresa: 'Mi Tienda' }, 'MENSUAL'))
      .toEqual({ nombreEmpresa: 'Mi Tienda', frecuenciaLiquidacion: 'MENSUAL' })
    expect(conFrecuenciaAlta({ nombreEmpresa: 'Mi Tienda' }, 'QUINCENAL').frecuenciaLiquidacion).toBe('QUINCENAL')
  })

  it('el selector arranca sin nada marcado y el aviso va con role="alert"', () => {
    const html = renderToStaticMarkup(createElement(SelectorFrecuencia, { valor: null, onCambiar: () => {}, error: ERROR_FRECUENCIA_OBLIGATORIA }))
    expect(html).not.toMatch(/\schecked(=""|\s|\/?>)/)
    expect(html).toContain('role="alert"')
    expect(html).toContain(ERROR_FRECUENCIA_OBLIGATORIA)
    expect(html).toContain('US$3 por pago')
    const elegido = renderToStaticMarkup(createElement(SelectorFrecuencia, { valor: 'MENSUAL', onCambiar: () => {} }))
    expect(elegido).toMatch(/\schecked(=""|\s|\/?>)/)
  })

  it('reconoce el 400 FRECUENCIA_INVALIDA y deja pasar los demás errores', () => {
    expect(esErrorFrecuenciaAlta({ response: { status: 400, data: { success: false, code: 'FRECUENCIA_INVALIDA' } } })).toBe(true)
    expect(esErrorFrecuenciaAlta({ response: { status: 400, data: { code: 'NOMBRE_NEGOCIO_EN_USO' } } })).toBe(false)
    expect(esErrorFrecuenciaAlta({ response: { status: 400 } })).toBe(false)
    expect(esErrorFrecuenciaAlta(new Error('red'))).toBe(false)
  })

  it('admin: la tienda rápida manda frecuenciaLiquidacion y sin elección no llama a la API', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    await consolaService.crearRapida('Mi Tienda', 'Ana', '88887777', 30, 'MENSUAL')
    expect(post).toHaveBeenCalledWith('/admin/consola/tiendas-rapidas',
      { negocio: 'Mi Tienda', persona: 'Ana', telefono: '88887777', dias: 30, frecuenciaLiquidacion: 'MENSUAL' })
    post.mockClear()
    expect(() => consolaService.crearRapida('Mi Tienda', 'Ana', '88887777', 30, null)).toThrow()
    expect(post).not.toHaveBeenCalled()
  })

  it.each([
    ['../../pages/RegistroEmpresaPage.tsx', 'authService.registroEmpresa(conFrecuenciaAlta('],
    ['../../pages/auth/EmprendimientoForm.tsx', 'authService.registroEmpresa(conFrecuenciaAlta('],
    ['../../pages/RegistrarNegocioPage.tsx', 'conFrecuenciaAlta({'],
    ['../../pages/admin/configuracion/SeccionPerfil.tsx', 'authService.nuevoNegocio(conFrecuenciaAlta('],
  ])('%s valida antes de enviar y manda la frecuencia', (ruta, llamada) => {
    const codigo = fuente(ruta)
    expect(codigo).toContain(llamada)
    expect(codigo).toContain('errorFrecuenciaAlta(')
    expect(codigo).toContain('esErrorFrecuenciaAlta(err)')
  })
})
