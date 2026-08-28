import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { blogService } from '@/services/blogService'
import { listaBlogDesdeRespuesta, type BlogForm } from './blogHelpers'
import type { Id, JsonBody } from '@/types/api'

type ShowToast = (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

type AdminBlogActionsDeps = {
  showToast: ShowToast
  setLista: Dispatch<SetStateAction<BlogForm[]>>
  setLoading: Dispatch<SetStateAction<boolean>>
}

/**
 * Handlers CRUD blog admin — bit-idéntico al original.
 */
export function useAdminBlogActions(deps: AdminBlogActionsDeps) {
  const { showToast, setLista, setLoading } = deps

  const fetchLista = useCallback(async () => {
    try {
      const r = await blogService.getAll()
      setLista(listaBlogDesdeRespuesta(r.data))
    } catch { showToast('Error cargando blog', 'error') }
    finally { setLoading(false) }
  }, [setLista, setLoading, showToast])

  const handleSave = useCallback(async (form: BlogForm) => {
    if (form.id) {
      await blogService.update(form.id, form as JsonBody)
      showToast('Actualizado', 'success')
    } else {
      await blogService.create(form as JsonBody)
      showToast('Entrada creada', 'success')
    }
    fetchLista()
  }, [fetchLista, showToast])

  const handleDelete = useCallback(async (id?: Id) => {
    if (!confirm('¿Eliminar esta entrada?')) return
    await blogService.delete(id as Id)
    showToast('Eliminada', 'success')
    setLista(prev => prev.filter(e => e.id !== id))
  }, [setLista, showToast])

  const togglePublicado = useCallback(async (e: BlogForm) => {
    try {
      await blogService.update(e.id as Id, { ...e, publicado: !e.publicado } as JsonBody)
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
