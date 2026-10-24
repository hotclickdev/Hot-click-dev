import { describe, expect, it } from 'vitest'
import { chatModalVisible, productoIdFromPath } from './chatSurface'

describe('QA2-015: el asistente se monta en la ficha', () => {
  it('la ficha /productos/{id} monta el asistente para que los chips lo abran', () => {
    expect(chatModalVisible('/productos/14', false, false)).toBe(true)
    expect(chatModalVisible('/', false, false)).toBe(true)
  })

  it('sigue oculto en tienda de vendedor, prototipo, POS y plataforma', () => {
    expect(chatModalVisible('/tienda/x', true, false)).toBe(false)
    expect(chatModalVisible('/claudeclick', false, true)).toBe(false)
    expect(chatModalVisible('/pos/venta', false, false)).toBe(false)
    expect(chatModalVisible('/plataforma/x', false, false)).toBe(false)
  })

  it('pasa el id numérico de la ficha al asistente', () => {
    expect(productoIdFromPath('/productos/14')).toBe(14)
    expect(productoIdFromPath('/productos/14/opiniones')).toBe(14)
    expect(productoIdFromPath('/productos')).toBeNull()
    expect(productoIdFromPath('/productos/sofa-gris')).toBeNull()
    expect(productoIdFromPath('/')).toBeNull()
  })
})
