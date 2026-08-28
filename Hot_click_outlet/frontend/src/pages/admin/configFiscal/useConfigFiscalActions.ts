import { useCallback, useRef, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { empresaService } from '@/services/empresaService'
import {
  lsRm,
  lsSet,
  mensajeErrorFiscal,
  type CertInfoFiscal,
  type FiscalFormData,
  type MsgFiscal,
} from './configFiscalHelpers'

type ConfigFiscalActionsDeps = {
  KEY: string
  form: FiscalFormData
  p12File: File | null
  setForm: Dispatch<SetStateAction<FiscalFormData>>
  setP12File: Dispatch<SetStateAction<File | null>>
  setSaving: Dispatch<SetStateAction<boolean>>
  setMsg: Dispatch<SetStateAction<MsgFiscal | null>>
  setHasDraft: Dispatch<SetStateAction<boolean>>
  setDraftSaved: Dispatch<SetStateAction<boolean>>
  setCertInfo: Dispatch<SetStateAction<CertInfoFiscal>>
  setServerData: Dispatch<SetStateAction<FiscalFormData | null>>
  serverData: FiscalFormData | null
}

/**
 * Handlers borrador y guardado fiscal — bit-idéntico al original.
 */
export function useConfigFiscalActions(deps: ConfigFiscalActionsDeps) {
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

  const draftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const saveDraft = useCallback((newForm: FiscalFormData) => {
    clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      const draftSafe = { ...newForm, claveHacienda: '' }
      lsSet(KEY, draftSafe)
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 800)
  }, [KEY, setDraftSaved])

  const set = useCallback((k: keyof FiscalFormData, v: string) => {
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

  const guardar = useCallback(async (e: FormEvent) => {
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
      setServerData(f => ({ ...(f ?? {}), claveHacienda: '' } as FiscalFormData))
      setMsg({ ok: true, text: 'Configuración fiscal guardada correctamente.' })
    } catch (err: unknown) {
      setMsg({ ok: false, text: mensajeErrorFiscal(err, 'Error al guardar.') })
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
