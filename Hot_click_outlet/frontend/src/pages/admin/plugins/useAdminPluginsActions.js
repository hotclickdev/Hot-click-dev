import { useCallback } from 'react'
import { pluginService } from '@/services/pluginService'
import { FORM_VACIO } from './pluginsHelpers'

/**
 * Handlers CRUD y test de plugins admin — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminPluginsActions(deps) {
  const {
    editando,
    form,
    setPlugins,
    setCargando,
    setError,
    setMostrarForm,
    setEditando,
    setForm,
    setGuardando,
    setTestOk,
  } = deps

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await pluginService.list()
      setPlugins(Array.isArray(data) ? data : [])
    } catch { setError('No se pudieron cargar los plugins') }
    finally { setCargando(false) }
  }, [setCargando, setError, setPlugins])

  const abrirNuevo = useCallback(() => {
    setForm(FORM_VACIO)
    setEditando(null)
    setMostrarForm(true)
  }, [setEditando, setForm, setMostrarForm])

  const abrirEdicion = useCallback((p) => {
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      tipo: p.tipo,
      url: p.url,
      eventosSuscritos: p.eventosSuscritos || '[]',
      secretoHmac: '',
    })
    setEditando(p)
    setMostrarForm(true)
  }, [setEditando, setForm, setMostrarForm])

  const guardar = useCallback(async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      if (editando) {
        await pluginService.update(editando.id, form)
      } else {
        await pluginService.create(form)
      }
      setMostrarForm(false)
      setEditando(null)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally { setGuardando(false) }
  }, [cargar, editando, form, setEditando, setError, setGuardando, setMostrarForm])

  const desactivar = useCallback(async (p) => {
    if (!confirm(`¿Desactivar el plugin "${p.nombre}"?`)) return
    try { await pluginService.remove(p.id); await cargar() }
    catch { setError('Error al desactivar') }
  }, [cargar, setError])

  const testWebhook = useCallback(async (p) => {
    setTestOk(null)
    try {
      await pluginService.test(p.id)
      setTestOk(p.id)
      setTimeout(() => setTestOk(null), 3000)
    } catch { setError('Error al enviar test') }
  }, [setError, setTestOk])

  return {
    cargar,
    abrirNuevo,
    abrirEdicion,
    guardar,
    desactivar,
    testWebhook,
  }
}
