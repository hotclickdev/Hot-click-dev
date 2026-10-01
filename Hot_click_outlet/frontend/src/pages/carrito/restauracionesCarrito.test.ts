import { beforeEach, describe, expect, it } from 'vitest'
import useChatStore from '@/store/chatStore'
import { contextoCarrito } from './cartHelpers'

describe('contexto del carrito para el asistente global', () => {
  it('usa el formato CARRITO:items:total del antiguo AICartSection', () => {
    const items = [{ nombre: 'Mouse', cantidad: 2 }, { nombre: 'Teclado', cantidad: 1 }]
    expect(contextoCarrito(items, 15000)).toBe('CARRITO:Mouse x2, Teclado x1:15000')
  })

  it('recorta la lista de productos a 200 caracteres', () => {
    const items = Array.from({ length: 40 }, (_, i) => ({ nombre: `Producto largo ${i}`, cantidad: 1 }))
    const [, resumen, total] = contextoCarrito(items, 99).split(':')
    expect(resumen).toHaveLength(200)
    expect(total).toBe('99')
  })
})

describe('chatStore: contexto opcional', () => {
  beforeEach(() => useChatStore.setState({ isOpen: false, pendingMessage: null, contexto: null }))

  it('open sin contexto deja el asistente en GENERAL (contexto null)', () => {
    useChatStore.getState().open('hola')
    expect(useChatStore.getState().contexto).toBeNull()
    expect(useChatStore.getState().pendingMessage).toBe('hola')
  })

  it('open con contexto lo guarda y close lo limpia', () => {
    useChatStore.getState().open('¿llega el viernes?', 'CARRITO:Mouse x1:5000')
    expect(useChatStore.getState().contexto).toBe('CARRITO:Mouse x1:5000')
    useChatStore.getState().close()
    expect(useChatStore.getState().contexto).toBeNull()
  })

  it('ignora un segundo argumento que no sea texto (open usado como onClick)', () => {
    useChatStore.getState().open('x', {} as unknown as string)
    expect(useChatStore.getState().contexto).toBeNull()
  })
})
