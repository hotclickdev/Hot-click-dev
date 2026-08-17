import { useCallback } from 'react'
import { productService } from '@/services/productService'

/**
 * Handlers de carrusel y destacado de productos admin.
 * @param {object} deps
 */
export function useAdminProductsCarrusel(deps) {
  const { products, carruselSlots, setProducts, toast, load } = deps

  const handleToggleCarrusel = useCallback(async (p) => {
    const yaEsta = p.enCarrusel
    if (yaEsta) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, enCarrusel: false, ordenCarrusel: 0 } : x)))
      try {
        await productService.toggleCarrusel(p.id, false, 0)
      } catch {
        setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, enCarrusel: true } : x)))
      }
      return
    }
    if (carruselSlots.length >= 5) {
      toast({ message: 'El carrusel ya tiene 5 productos (máximo)', type: 'error' })
      return
    }
    const existing = [...carruselSlots]
    const allAssignments = [
      ...existing.map((s, i) => ({ id: s.id, orden: i + 1 })),
      { id: p.id, orden: existing.length + 1 },
    ]
    setProducts((prev) => prev.map((x) => {
      const a = allAssignments.find((n) => n.id === x.id)
      return a ? { ...x, enCarrusel: true, ordenCarrusel: a.orden } : x
    }))
    try {
      await Promise.all(allAssignments.map(({ id, orden }) =>
        productService.toggleCarrusel(id, true, orden),
      ))
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, enCarrusel: false } : x)))
    }
  }, [carruselSlots, setProducts, toast])

  const handleCarruselMover = useCallback(async (p, dir) => {
    const sorted = [...products]
      .filter((x) => x.enCarrusel)
      .sort((a, b) => (a.ordenCarrusel ?? 0) - (b.ordenCarrusel ?? 0))

    const idx = sorted.findIndex((x) => x.id === p.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const reordered = [...sorted]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]

    const assignments = reordered.map((s, i) => ({ id: s.id, orden: i + 1 }))

    setProducts((prev) => prev.map((x) => {
      const a = assignments.find((n) => n.id === x.id)
      return a ? { ...x, ordenCarrusel: a.orden } : x
    }))

    try {
      await Promise.all(assignments.map(({ id, orden }) =>
        productService.toggleCarrusel(id, true, orden),
      ))
    } catch {
      toast({ message: 'Error al reordenar el carrusel', type: 'error' })
      load()
    }
  }, [products, setProducts, toast, load])

  const handleToggleDestacado = useCallback(async (p) => {
    const nuevoValor = !p.destacado
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, destacado: nuevoValor } : x)))
    try {
      await productService.toggleDestacado(p.id, nuevoValor)
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, destacado: p.destacado } : x)))
      toast({ message: 'Error al actualizar destacado', type: 'error' })
    }
  }, [setProducts, toast])

  return { handleToggleCarrusel, handleCarruselMover, handleToggleDestacado }
}
