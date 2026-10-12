import { describe, expect, it } from 'vitest'
import i18n from './index'
import { debeCompletarNegocio } from '@/app/negocioIncompleto'

describe('i18n: el fallback siempre es español', () => {
  it('una clave que falta en pt cae a es, no a pt ni a la clave cruda', async () => {
    i18n.addResource('es', 'translation', 'pruebaFallback.soloEs', 'Turno activo')
    await i18n.changeLanguage('pt')
    expect(i18n.t('pruebaFallback.soloEs')).toBe('Turno activo')
    await i18n.changeLanguage('es')
  })

  it('los textos del POS en es están en español', async () => {
    await i18n.changeLanguage('es')
    expect(i18n.t('pos.common.turnoActivo')).toBe('Turno activo')
    expect(i18n.t('pos.venta.subtitle')).not.toMatch(/Registre uma venda/)
  })

  it('fallbackLng es es y pt solo se usa si se elige', () => {
    expect(i18n.options.fallbackLng).toEqual(['es'])
  })
})

describe('debeCompletarNegocio', () => {
  it('EMPRENDEDOR sin empresa → completar; con empresa o ADMIN → no', () => {
    expect(debeCompletarNegocio('EMPRENDEDOR', null)).toBe(true)
    expect(debeCompletarNegocio('EMPRENDEDOR', undefined)).toBe(true)
    expect(debeCompletarNegocio('EMPRENDEDOR', 7)).toBe(false)
    expect(debeCompletarNegocio('ADMIN', null)).toBe(false)
    expect(debeCompletarNegocio('USUARIO_FINAL', null)).toBe(false)
  })
})
