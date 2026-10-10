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
