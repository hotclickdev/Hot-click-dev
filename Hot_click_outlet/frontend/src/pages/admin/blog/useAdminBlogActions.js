import { useCallback } from 'react'
import { blogService } from '@/services/blogService'

/**
 * Handlers CRUD blog admin — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminBlogActions(deps) {
  const { showToast, setLista, setLoading } = deps

  const fetchLista = useCallback(async () => {
    try {
      const r = await blogService.getAll()
      setLista(r.data?.data ?? [])
    } catch { showToast('Error cargando blog', 'error') }
    finally { setLoading(false) }
  }, [setLista, setLoading, showToast])

  const handleSave = useCallback(async (form) => {
    if (form.id) {
      await blogService.update(form.id, form)
      showToast('Actualizado', 'success')
    } else {
      await blogService.create(form)
      showToast('Entrada creada', 'success')
    }
    fetchLista()
  }, [fetchLista, showToast])

  const handleDelete = useCallback(async (id) => {
    if (!confirm('¿Eliminar esta entrada?')) return
    await blogService.delete(id)
    showToast('Eliminada', 'success')
    setLista(prev => prev.filter(e => e.id !== id))
  }, [setLista, showToast])

  const togglePublicado = useCallback(async (e) => {
    try {
      await blogService.update(e.id, { ...e, publicado: !e.publicado })
      setLista(prev => prev.map(x => x.id === e.id ? { ...x, publicado: !x.publicado } : x))
      showToast(e.publicado ? 'Movido a borrador' : 'Publicado', 'success')
    } catch { showToast('Error', 'error') }
  }, [setLista, showToast])

  return {
    fetchLista,
    handleSave,
    handleDelete,
    togglePublicado,
  }
}
