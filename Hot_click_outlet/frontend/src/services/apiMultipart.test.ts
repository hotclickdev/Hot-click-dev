import { describe, expect, it, vi } from 'vitest'
import { quitarContentTypeSiFormData } from './apiMultipart'

describe('quitarContentTypeSiFormData', () => {
  it('usa setContentType(false) cuando Axios lo expone', () => {
    const headers = { setContentType: vi.fn(), delete: vi.fn() }
    quitarContentTypeSiFormData(headers, new FormData())
    expect(headers.setContentType).toHaveBeenCalledWith(false)
    expect(headers.delete).not.toHaveBeenCalled()
  })

  it('borra Content-Type cuando el body es FormData', () => {
    const headers = { 'Content-Type': 'application/json', delete: vi.fn() }
    quitarContentTypeSiFormData(headers, new FormData())
    expect(headers.delete).toHaveBeenCalledWith('Content-Type')
  })

  it('no toca headers si el body no es FormData', () => {
    const headers = { 'Content-Type': 'application/json', delete: vi.fn() }
    quitarContentTypeSiFormData(headers, { nombre: 'x' })
    expect(headers.delete).not.toHaveBeenCalled()
  })

  it('borra la clave en un objeto plano sin .delete', () => {
    const headers: { 'Content-Type'?: string } = { 'Content-Type': 'application/json' }
    quitarContentTypeSiFormData(headers, new FormData())
    expect(headers['Content-Type']).toBeUndefined()
  })
})
