import { useCallback, useRef } from 'react'
import { empresaService } from '@/services/empresaService'
import { lsRm, lsSet } from './configFiscalHelpers'

/**
 * Handlers borrador y guardado fiscal — bit-idéntico al original.
 * @param {object} deps
 */
export function useConfigFiscalActions(deps) {
  const {
    KEY,
    form,
    p12File,
    setForm,
    setP12File,
    setSaving,
    setMsg,
    setHasDraft,
    setDraftSaved,
    setCertInfo,
    setServerData,
    serverData,
  } = deps

  const draftTimer = useRef(null)

  const saveDraft = useCallback((newForm) => {
    clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      const draftSafe = { ...newForm, claveHacienda: '' }
      lsSet(KEY, draftSafe)
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 800)
  }, [KEY, setDraftSaved])

  const set = useCallback((k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      saveDraft(next)
      return next
    })
  }, [saveDraft, setForm])

  const descartarBorrador = useCallback(() => {
    lsRm(KEY)
    setHasDraft(false)
    if (serverData) setForm(serverData)
  }, [KEY, serverData, setForm, setHasDraft])

  const guardar = useCallback(async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      if (p12File) {
        const fd = new FormData()
        fd.append('file', p12File)
        await empresaService.uploadCertP12(fd)
        setCertInfo(c => ({ ...c, tieneCertP12: true }))
        setP12File(null)
      }
      await empresaService.updateFiscal(form)
      if (form.claveHacienda) setCertInfo(c => ({ ...c, tieneClaveHacienda: true }))
      lsRm(KEY)
      setHasDraft(false)
      setForm(f => ({ ...f, claveHacienda: '' }))
      setServerData(f => ({ ...f, claveHacienda: '' }))
      setMsg({ ok: true, text: 'Configuración fiscal guardada correctamente.' })
    } catch (err) {
      setMsg({ ok: false, text: err?.response?.data?.message ?? 'Error al guardar.' })
    } finally {
      setSaving(false)
    }
  }, [
    form,
    p12File,
    KEY,
    setCertInfo,
    setForm,
    setHasDraft,
    setMsg,
    setP12File,
    setSaving,
    setServerData,
  ])

  return {
    saveDraft,
    set,
    descartarBorrador,
    guardar,
  }
}
