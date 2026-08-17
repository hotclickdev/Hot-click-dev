import { useState, useEffect, useCallback, useRef } from 'react'
import { empresaService } from '@/services/empresaService'
import useAuthStore from '@/store/authStore'

const TIPOS_CEDULA = [{ v: '01', l: 'Física' }, { v: '02', l: 'Jurídica' }, { v: '03', l: 'DIMEX' }, { v: '04', l: 'NITE' }]
const AMBIENTES    = [{ v: 'STAG', l: 'Sandbox (pruebas)' }, { v: 'PROD', l: 'Producción (Hacienda real) — solo ADMIN' }]
// draft key incluye empresaId para que cambiar de negocio no muestre datos ajenos
const draftKey = (id) => `hotclick-fiscal-draft-${id ?? 'anon'}`

// localStorage seguro — falla silenciosamente en modo incógnito
const lsGet  = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } }
const lsSet  = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* noop */ } }
const lsRm   = (k) => { try { localStorage.removeItem(k) } catch { /* noop */ } }

const EMPTY_FORM = {
  cedulaJuridica: '', tipoCedula: '02', actividadEconomica: '',
  nombreComercialFe: '', usuarioHacienda: '', claveHacienda: '',
  ambienteHacienda: 'STAG',
}

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
  // tieneCertP12 y tieneClaveHacienda vienen del servidor (indicadores seguros)
  const [certInfo, setCertInfo]     = useState({ tieneCertP12: false, tieneClaveHacienda: false })
  const draftTimer = useRef(null)

  // ── Cargar datos del servidor ─────────────────────────────────────────────
  // KEY incluye empresaId — re-corre si el usuario cambia de negocio
  useEffect(() => {
    empresaService.getPerfil()
      .then(({ data }) => {
        const server = {
          cedulaJuridica:     data.cedulaJuridica    ?? '',
          tipoCedula:         data.tipoCedula        ?? '02',
          actividadEconomica: data.actividadEconomica ?? '',
          nombreComercialFe:  data.nombreComercialFe ?? '',
          usuarioHacienda:    data.usuarioHacienda   ?? '',
          claveHacienda:      '',              // nunca viene del servidor
          ambienteHacienda:   data.ambienteHacienda  ?? 'STAG',
        }
        setServerData(server)
        setCertInfo({
          tieneCertP12:      !!data.tieneCertP12,
          tieneClaveHacienda: !!data.tieneClaveHacienda,
        })

        // Si hay borrador guardado, recuperarlo (lsGet ya devuelve objeto o null)
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

  // ── Auto-guardar borrador en localStorage (debounced 800ms) ───────────────
  const saveDraft = useCallback((newForm) => {
    clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      // No guardar la clave en el borrador por seguridad
      const draftSafe = { ...newForm, claveHacienda: '' }
      lsSet(KEY, draftSafe)
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 800)
  }, [KEY])

  const set = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      saveDraft(next)
      return next
    })
  }

  const descartarBorrador = () => {
    lsRm(KEY)
    setHasDraft(false)
    if (serverData) setForm(serverData)
  }

  // ── Guardar en servidor ───────────────────────────────────────────────────
  const guardar = async (e) => {
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
      // Limpiar borrador y campo clave del form tras guardar exitoso
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
  }

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

      {/* Banner borrador recuperado */}
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

      {/* Aviso ambiente PROD */}
      {form.ambienteHacienda === 'PROD' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          <strong>Ambiente PRODUCCIÓN activo.</strong> Los comprobantes emitidos son fiscalmente válidos
          y se envían a Hacienda CR. Asegurate de que el certificado y las credenciales sean los de producción.
        </div>
      )}

      <form onSubmit={guardar} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">

        {/* Ambiente */}
        <div>
          <label htmlFor="fiscal-ambiente" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ambiente Hacienda
          </label>
          <select id="fiscal-ambiente"
            value={form.ambienteHacienda}
            onChange={e => set('ambienteHacienda', e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            {AMBIENTES.map(o => (
              <option key={o.v} value={o.v} disabled={o.v === 'PROD' && !isAdmin}>
                {o.l}
              </option>
            ))}
          </select>
        </div>

        {/* Cédula */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="fiscal-tipo-cedula" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo cédula</label>
            <select id="fiscal-tipo-cedula"
              value={form.tipoCedula}
              onChange={e => set('tipoCedula', e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              {TIPOS_CEDULA.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="fiscal-cedula" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número de cédula / RUC</label>
            <input id="fiscal-cedula"
              value={form.cedulaJuridica}
              onChange={e => set('cedulaJuridica', e.target.value)}
              placeholder="3-101-123456"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
        </div>

        {/* Actividad económica */}
        <div>
          <label htmlFor="fiscal-actividad" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Código actividad económica (CIIU)
          </label>
          <input id="fiscal-actividad"
            value={form.actividadEconomica}
            onChange={e => set('actividadEconomica', e.target.value)}
            placeholder="ej. 4791"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </div>

        {/* Nombre comercial */}
        <div>
          <label htmlFor="fiscal-nombre-comercial" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nombre comercial (en el comprobante)
          </label>
          <input id="fiscal-nombre-comercial"
            value={form.nombreComercialFe}
            onChange={e => set('nombreComercialFe', e.target.value)}
            placeholder="Nombre que aparece en la factura"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </div>

        <hr className="border-gray-100 dark:border-gray-700" />
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Credenciales ATV (Hacienda)</p>

        {/* Usuario y clave Hacienda */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fiscal-usuario-atv" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario ATV</label>
            <input id="fiscal-usuario-atv"
              value={form.usuarioHacienda}
              onChange={e => set('usuarioHacienda', e.target.value)}
              placeholder="usuario@empresa.com"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
          <div>
            <label htmlFor="fiscal-clave-atv" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Clave ATV
              {certInfo.tieneClaveHacienda && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-normal">✓ configurada</span>
              )}
            </label>
            <input id="fiscal-clave-atv"
              type="password"
              value={form.claveHacienda}
              onChange={e => set('claveHacienda', e.target.value)}
              placeholder={certInfo.tieneClaveHacienda ? '(dejar vacío para no cambiar)' : 'Ingresá tu clave ATV'}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
        </div>

        {/* Certificado P12 */}
        <div>
          <label htmlFor="fiscal-cert-p12" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Certificado PKCS#12 (.p12)
            {certInfo.tieneCertP12 && (
              <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-normal">✓ cargado</span>
            )}
          </label>
          <input id="fiscal-cert-p12"
            type="file"
            accept=".p12,.pfx"
            onChange={e => setP12File(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0
              file:bg-[var(--hc-info-bg)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--hc-link)]
              hover:file:bg-[var(--hc-blue-100)] dark:text-gray-400"
          />
          {p12File && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Archivo listo: {p12File.name} ({(p12File.size / 1024).toFixed(1)} KB)
            </p>
          )}
          {!p12File && (
            <p className="mt-1 text-xs text-gray-400">
              {certInfo.tieneCertP12
                ? 'Solo subir si necesitás reemplazar el certificado actual.'
                : 'Subí tu archivo .p12 emitido por SINPE o Bansaseguros.'}
            </p>
          )}
        </div>

        {/* Indicador borrador auto-guardado */}
        {draftSaved && (
          <p className="text-xs text-gray-400 italic">Borrador guardado automáticamente.</p>
        )}

        {msg && (
          <p className={`rounded-lg px-4 py-2 text-sm ${msg.ok
            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {msg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[var(--hc-primary)] py-2.5 text-sm font-semibold text-white
            hover:bg-[var(--hc-primary-hover)] disabled:opacity-50 transition"
        >
          {saving ? 'Guardando…' : 'Guardar configuración fiscal'}
        </button>
      </form>

      {/* Guía rápida */}
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
