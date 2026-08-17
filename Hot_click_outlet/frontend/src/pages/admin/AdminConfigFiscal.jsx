import { useState, useEffect } from 'react'
import { empresaService } from '@/services/empresaService'
import useAuthStore from '@/store/authStore'
import {
  draftKey,
  EMPTY_FORM,
  lsGet,
  serverFormFromPerfil,
} from './configFiscal/configFiscalHelpers'
import { useConfigFiscalActions } from './configFiscal/useConfigFiscalActions'
import FiscalForm from './configFiscal/FiscalForm'

export default function AdminConfigFiscal() {
  const { empresaId, userRole } = useAuthStore()
  const isAdmin = userRole === 'ADMIN'
  const KEY = draftKey(empresaId)

  const [form, setForm]             = useState(EMPTY_FORM)
  const [p12File, setP12File]       = useState(null)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState(null)
  const [loading, setLoading]       = useState(true)
  const [hasDraft, setHasDraft]     = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [serverData, setServerData] = useState(null)
  const [certInfo, setCertInfo]     = useState({ tieneCertP12: false, tieneClaveHacienda: false })

  useEffect(() => {
    empresaService.getPerfil()
      .then(({ data }) => {
        const server = serverFormFromPerfil(data)
        setServerData(server)
        setCertInfo({
          tieneCertP12:      !!data.tieneCertP12,
          tieneClaveHacienda: !!data.tieneClaveHacienda,
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
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando…</div>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configuración Fiscal — Hacienda CR
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Datos necesarios para emitir comprobantes electrónicos (XML 4.3).
        </p>
      </div>

      {hasDraft && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <span>📝 Hay un borrador guardado. Podés continuar desde donde lo dejaste.</span>
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
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

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pasos para activar facturación</p>
        <ol className="space-y-1 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
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
