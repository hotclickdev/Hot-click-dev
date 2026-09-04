import { useState, useEffect } from 'react'
import { empresaService } from '@/services/empresaService'
import useAuthStore from '@/store/authStore'
import {
  draftKey,
  EMPTY_FORM,
  lsGet,
  serverFormFromPerfil,
  type CertInfoFiscal,
  type FiscalFormData,
  type MsgFiscal,
} from './configFiscal/configFiscalHelpers'
import { useConfigFiscalActions } from './configFiscal/useConfigFiscalActions'
import FiscalForm from './configFiscal/FiscalForm'

export default function AdminConfigFiscal() {
  const { empresaId, userRole } = useAuthStore()
  const isAdmin = userRole === 'ADMIN'
  const KEY = draftKey(empresaId)

  const [form, setForm]             = useState<FiscalFormData>(EMPTY_FORM)
  const [p12File, setP12File]       = useState<File | null>(null)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState<MsgFiscal | null>(null)
  const [loading, setLoading]       = useState(true)
  const [hasDraft, setHasDraft]     = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [serverData, setServerData] = useState<FiscalFormData | null>(null)
  const [certInfo, setCertInfo]     = useState<CertInfoFiscal>({ tieneCertP12: false, tieneClaveHacienda: false })

  useEffect(() => {
    empresaService.getPerfil()
      .then(({ data }) => {
        const server = serverFormFromPerfil(data)
        setServerData(server)
        const perfil = (data && typeof data === 'object')
          ? data as { tieneCertP12?: boolean; tieneClaveHacienda?: boolean }
          : {}
        setCertInfo({
          tieneCertP12:      !!perfil.tieneCertP12,
          tieneClaveHacienda: !!perfil.tieneClaveHacienda,
        })

        const draft = lsGet(KEY)
        if (draft) {
          setForm(draft)
          setHasDraft(true)
        } else {
          setForm(server)
        }
      })
      .catch(() => setForm(EMPTY_FORM))
      .finally(() => setLoading(false))
  }, [KEY])

  const { set, descartarBorrador, guardar } = useConfigFiscalActions({
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
  })

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--hc-text-disabled)' }}>Cargando…</div>
  )

  // La config fiscal es por empresa; un ADMIN sin empresa asociada solo puede
  // editarla impersonando al propietario del negocio (ver Tiendas → "Ver como esta empresa").
  if (isAdmin && !empresaId) return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-xl p-4 text-sm" style={{ border: '1px solid #F6E3AA', background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }}>
        Necesitás estar viendo como una empresa para configurar sus datos fiscales.
        Andá a <strong>Tiendas</strong> y usá <strong>"Ver como esta empresa"</strong>.
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="font-[var(--hc-font-display)] text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
          Configuración Fiscal — Hacienda CR
        </h1>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          Datos necesarios para emitir comprobantes electrónicos (XML 4.3).
        </p>
      </div>

      {hasDraft && (
        <div className="flex items-center justify-between rounded-xl px-4 py-3 text-sm" style={{ border: '1px solid #F6E3AA', background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }}>
          <span>Hay un borrador guardado. Podés continuar desde donde lo dejaste.</span>
          <button
            type="button"
            onClick={descartarBorrador}
            className="ml-4 text-xs underline opacity-70 hover:opacity-100"
          >
            Descartar
          </button>
        </div>
      )}

      {form.ambienteHacienda === 'PROD' && (
        <div className="rounded-xl p-4 text-sm" style={{ border: '1px solid #F6C1BD', background: 'var(--hc-danger-bg)', color: 'var(--hc-danger)' }}>
          <strong>Ambiente PRODUCCIÓN activo.</strong> Los comprobantes emitidos son fiscalmente válidos
          y se envían a Hacienda CR. Asegurate de que el certificado y las credenciales sean los de producción.
        </div>
      )}

      <FiscalForm
        form={form}
        isAdmin={isAdmin}
        certInfo={certInfo}
        p12File={p12File}
        draftSaved={draftSaved}
        msg={msg}
        saving={saving}
        onSubmit={guardar}
        onSet={set}
        onP12File={setP12File}
      />

      <div className="rounded-xl p-4" style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface-2)' }}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-text-disabled)' }}>Pasos para activar facturación</p>
        <ol className="space-y-1 text-sm list-decimal list-inside" style={{ color: 'var(--hc-muted)' }}>
          <li>Obtener usuario y clave en el portal ATV de Hacienda CR</li>
          <li>Solicitar el certificado PKCS#12 a SINPE o Bansaseguros</li>
          <li>Completar este formulario con el ambiente STAG (sandbox) primero</li>
          <li>Emitir un tiquete de prueba desde cualquier pedido</li>
          <li>Verificar estado ACEPTADO en la tabla de comprobantes</li>
          <li>Cambiar el ambiente a PROD para comenzar a facturar en producción</li>
        </ol>
      </div>
    </div>
  )
}
