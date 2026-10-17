import { describe, expect, it } from 'vitest'
import { esRutaConCoach } from './mmRegistry'

describe('QA-122-5: sin coach («Empezar guías») encima del onboarding guiado', () => {
  it('el onboarding de negocio rápido no abre la bienvenida', () => {
    expect(esRutaConCoach('/emprendedor/negocio-rapido')).toBe(false)
    expect(esRutaConCoach('/emprendedor/negocio-rapido/')).toBe(false)
    expect(esRutaConCoach('/emprendedor/negocio-rapido?x=1')).toBe(false)
  })
  it('el resto del panel del vendedor sigue con coach', () => {
    expect(esRutaConCoach('/emprendedor')).toBe(esRutaConCoach('/emprendedor/productos'))
  })
})

describe('NP-21: guías fuera de contexto', () => {
  it('la guía del inicio del panel no aparece en el historial del POS ni en Encargos', async () => {
    const { guiaPara } = await import('./mmRegistry')
    expect(guiaPara('/emprendedor/pos/historial', 'EMPRENDEDOR')?.path).not.toBe('/emprendedor')
    expect(guiaPara('/emprendedor/encargos', 'EMPRENDEDOR')?.path).not.toBe('/emprendedor')
    expect(guiaPara('/emprendedor', 'EMPRENDEDOR')?.path).toBe('/emprendedor')
  })

  it('el texto de Productos no supone que el catálogo está vacío', async () => {
    const { guiaPara } = await import('./mmRegistry')
    const textos = guiaPara('/emprendedor', 'EMPRENDEDOR')?.pasos.map((p) => p.texto).join(' ') ?? ''
    expect(textos).not.toMatch(/Sin productos no hay ventas|Empezá subiendo/)
  })
})
