import { useCallback, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { pluginService } from '@/services/pluginService'
import { FORM_VACIO, mensajeErrorPlugin } from './pluginsHelpers'
import type { PluginAdmin, PluginForm } from './pluginsHelpers'
import type { Id, JsonBody } from '@/types/api'

/**
 * Handlers CRUD y test de plugins admin — bit-idéntico al original.
 */
export function useAdminPluginsActions(deps: {
  editando: PluginAdmin | null
  form: PluginForm
  setPlugins: Dispatch<SetStateAction<PluginAdmin[]>>
  setCargando: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
  setMostrarForm: Dispatch<SetStateAction<boolean>>
  setEditando: Dispatch<SetStateAction<PluginAdmin | null>>
  setForm: Dispatch<SetStateAction<PluginForm>>
  setGuardando: Dispatch<SetStateAction<boolean>>
  setTestOk: Dispatch<SetStateAction<Id | null>>
}) {
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
      setPlugins(Array.isArray(data) ? data as PluginAdmin[] : [])
    } catch (err: unknown) { void err; setError('No se pudieron cargar los plugins') }
    finally { setCargando(false) }
  }, [setCargando, setError, setPlugins])

  const abrirNuevo = useCallback(() => {
    setForm(FORM_VACIO)
    setEditando(null)
    setMostrarForm(true)
  }, [setEditando, setForm, setMostrarForm])

  const abrirEdicion = useCallback((p: PluginAdmin) => {
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

  const guardar = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      if (editando) {
        await pluginService.update(editando.id, form as unknown as JsonBody)
      } else {
        await pluginService.create(form as unknown as JsonBody)
      }
      setMostrarForm(false)
      setEditando(null)
      await cargar()
    } catch (err: unknown) {
      setError(mensajeErrorPlugin(err, 'Error al guardar'))
    } finally { setGuardando(false) }
  }, [cargar, editando, form, setEditando, setError, setGuardando, setMostrarForm])

  const desactivar = useCallback(async (p: PluginAdmin) => {
    if (!confirm(`¿Desactivar el plugin "${p.nombre}"?`)) return
    try { await pluginService.remove(p.id); await cargar() }
    catch (err: unknown) { void err; setError('Error al desactivar') }
  }, [cargar, setError])

  const testWebhook = useCallback(async (p: PluginAdmin) => {
    setTestOk(null)
    try {
      await pluginService.test(p.id)
      setTestOk(p.id)
      setTimeout(() => setTestOk(null), 3000)
    } catch (err: unknown) { void err; setError('Error al enviar test') }
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
