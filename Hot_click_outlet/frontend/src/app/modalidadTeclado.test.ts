import { describe, expect, it } from 'vitest'
import { CLASE_TECLADO, esTeclaDeFoco, instalarModalidadTeclado } from './modalidadTeclado'

const tecla = (key: string, extra: Partial<Record<'altKey' | 'ctrlKey' | 'metaKey', boolean>> = {}) =>
  ({ key, altKey: false, ctrlKey: false, metaKey: false, ...extra })

function evento(tipo: string, props: object = {}) {
  return Object.assign(new Event(tipo), props)
}

describe('modalidad de teclado', () => {
  it('solo Tab sin Alt, Ctrl ni Meta cuenta como navegación', () => {
    expect(esTeclaDeFoco(tecla('Tab'))).toBe(true)
    expect(esTeclaDeFoco(tecla('a'))).toBe(false)
    expect(esTeclaDeFoco(tecla('Enter'))).toBe(false)
    expect(esTeclaDeFoco(tecla('Tab', { ctrlKey: true }))).toBe(false)
    expect(esTeclaDeFoco(tecla('Tab', { altKey: true }))).toBe(false)
  })

  it('Tab enciende la clase, un toque la apaga y al desinstalar deja de escuchar', () => {
    const destino = new EventTarget()
    const clases = new Set<string>()
    const raiz = { classList: { add: (c: string) => { clases.add(c) }, remove: (c: string) => { clases.delete(c) } } }
    const quitar = instalarModalidadTeclado(destino, raiz)

    destino.dispatchEvent(evento('keydown', tecla('x')))
    expect(clases.has(CLASE_TECLADO)).toBe(false)
    destino.dispatchEvent(evento('keydown', tecla('Tab')))
    expect(clases.has(CLASE_TECLADO)).toBe(true)
    destino.dispatchEvent(evento('pointerdown'))
    expect(clases.has(CLASE_TECLADO)).toBe(false)

    quitar()
    destino.dispatchEvent(evento('keydown', tecla('Tab')))
    expect(clases.has(CLASE_TECLADO)).toBe(false)
  })
})
