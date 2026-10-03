import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import i18n from '@/i18n'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = resolve(aqui, '../../../..')

describe('Buscar con una foto · explicación y privacidad', () => {
  it('textos en es/en/pt para título, pasos, consejos y privacidad', async () => {
    const claves = ['photoHeroTitle', 'photoHeroSub', 'photoStep1', 'photoStep2', 'photoStep3', 'photoTip1', 'photoTip2', 'photoTip3', 'photoPrivacy', 'photoChoose', 'photoExplore', 'photoBadType', 'photoTooBig']
    for (const lang of ['es', 'en', 'pt']) {
      await i18n.changeLanguage(lang)
      for (const k of claves) expect(i18n.exists(`search.${k}`), `${lang}:${k}`).toBe(true)
    }
    await i18n.changeLanguage('es')
    expect(i18n.t('search.photoHeroTitle')).toBe('Buscá con una foto')
    expect([1, 2, 3].map((n) => i18n.t(`search.photoStep${n}`))).toEqual(['Sacá o subí una foto', 'Analizamos el producto', 'Te mostramos opciones parecidas'])
  })

  it('la nota de privacidad solo es cierta si el backend no guarda la imagen', () => {
    const handler = readFileSync(
      resolve(raiz, 'src/main/java/com/hotclick/rag/controller/shoppingassistant/ShoppingAssistantImageSearchHandler.java'),
      'utf8',
    )
    // La foto se lee en memoria, se manda a analizar y se descarta: sin storage, repositorio ni archivo.
    expect(handler).not.toMatch(/StorageService|Repository|Files\.write|upload\(/)
  })

  it('la página usa botones del manual (rojo 48 px radio 12) y no el radio 24 de rounded-xl', () => {
    const src = readFileSync(resolve(aqui, 'BusquedaFotoPage.tsx'), 'utf8')
    expect(src).toContain('h-12')
    expect(src).toContain('rounded-[12px]')
    expect(src).toContain('bg-hc-red-500')
    expect(src).not.toContain('rounded-xl')
    expect(src).toContain("t('search.photoPrivacy')")
  })
})
