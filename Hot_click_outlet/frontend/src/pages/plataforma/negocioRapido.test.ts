import { describe, expect, it } from 'vitest'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import pt from '@/i18n/locales/pt.json'
import { RUTA_ONBOARDING_RAPIDO, destinoPaso, motivoEnlace, pasosDe } from './tiendaRapida'

describe('negocio rápido: enlace de asignación', () => {
  it('409 es enlace usado, 410 vencido o anulado, el resto no vigente', () => {
    expect(motivoEnlace({ response: { status: 409 } })).toBe('usado')
    expect(motivoEnlace({ response: { status: 410 } })).toBe('vencido')
    expect(motivoEnlace({ response: { status: 404 } })).toBe('noVigente')
    expect(motivoEnlace(new Error('red'))).toBe('noVigente')
    expect(motivoEnlace(null)).toBe('noVigente')
  })

  it('el texto legal es un placeholder marcado [REVISIÓN LEGAL] en es, en y pt', () => {
    for (const locale of [es, en, pt]) {
      const nr = (locale as { negocioRapido: { aceptar: { legal: string; casilla: string } } }).negocioRapido
      expect(nr.aceptar.legal.startsWith('[REVISIÓN LEGAL]')).toBe(true)
      expect(nr.aceptar.casilla.length).toBeGreaterThan(20)
    }
  })

  it('el onboarding queda en una ruta interna del panel', () => {
    expect(RUTA_ONBOARDING_RAPIDO.startsWith('/emprendedor/')).toBe(true)
  })
})

describe('negocio rápido: pasos del onboarding', () => {
  it('respeta el orden del backend y descarta pasos desconocidos', () => {
    const pasos = pasosDe({
      pasos: [
        { paso: 'BODEGA', estado: 'HECHO', omitible: false },
        { paso: 'PRODUCTO', estado: 'PENDIENTE', omitible: false },
        { paso: 'HACK', estado: 'PENDIENTE' },
        { paso: 'NEGOCIO', estado: 'BLOQUEADO', omitible: true },
        null,
      ],
    })
    expect(pasos.map((p) => p.paso)).toEqual(['BODEGA', 'PRODUCTO', 'NEGOCIO'])
    expect(pasos[2]).toEqual({ paso: 'NEGOCIO', estado: 'BLOQUEADO', omitible: true })
    expect(pasosDe(undefined)).toEqual([])
  })

  it('cada paso reutiliza el flujo existente del panel', () => {
    expect(destinoPaso('BODEGA')).toBe('/emprendedor/opciones/bodegas/nueva?volver=negocio-rapido')
    expect(destinoPaso('PRODUCTO')).toBe('/emprendedor/productos/nuevo?volver=negocio-rapido')
    expect(destinoPaso('NEGOCIO')).toBe('/emprendedor/opciones/negocio')
    expect(destinoPaso('COBRO')).toBe('/emprendedor/opciones/cobro')
    expect(destinoPaso('X')).toBe('/emprendedor')
  })
})

describe('negocio rápido: vuelta al onboarding y menú', () => {
  it('solo la clave permitida vuelve al onboarding; el resto sigue igual (sin open redirect)', async () => {
    const { rutaVolver, SUFIJO_VOLVER_ONBOARDING } = await import('./tiendaRapida')
    expect(rutaVolver(SUFIJO_VOLVER_ONBOARDING)).toBe(RUTA_ONBOARDING_RAPIDO)
    expect(rutaVolver('')).toBeNull()
    expect(rutaVolver('?volver=https://evil.example')).toBeNull()
    expect(rutaVolver('?volver=//evil.example')).toBeNull()
    expect(rutaVolver('?volver=/emprendedor/pedidos')).toBeNull()
    expect(rutaVolver('?volver=__proto__')).toBeNull()
    expect(rutaVolver('?volver=toString')).toBeNull()
  })

  it('los pasos de bodega y producto abren el wizard con la vuelta', () => {
    expect(destinoPaso('BODEGA')).toContain('?volver=negocio-rapido')
    expect(destinoPaso('PRODUCTO')).toContain('?volver=negocio-rapido')
    expect(destinoPaso('NEGOCIO')).not.toContain('volver')
  })

  it('el acceso del menú se muestra solo con onboarding pendiente', async () => {
    const { onboardingPendiente } = await import('./tiendaRapida')
    const pasos = [{ paso: 'BODEGA', estado: 'PENDIENTE', omitible: false }]
    expect(onboardingPendiente({ completo: false, pasos })).toBe(true)
    expect(onboardingPendiente({ completo: true, pasos })).toBe(false)
    expect(onboardingPendiente({ completo: false, pasos: [] })).toBe(false)
    expect(onboardingPendiente(undefined)).toBe(false)
  })
})
