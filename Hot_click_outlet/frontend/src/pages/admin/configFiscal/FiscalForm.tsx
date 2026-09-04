import { TIPOS_CEDULA, AMBIENTES, type CertInfoFiscal, type FiscalFormData, type MsgFiscal } from './configFiscalHelpers'
import type { FormEvent } from 'react'

export type FiscalFormProps = {
  form: FiscalFormData
  isAdmin: boolean
  certInfo: CertInfoFiscal
  p12File: File | null
  draftSaved: boolean
  msg: MsgFiscal | null
  saving: boolean
  onSubmit: (e: FormEvent) => void
  onSet: (k: keyof FiscalFormData, v: string) => void
  onP12File: (file: File | null) => void
}

export default function FiscalForm({
  form,
  isAdmin,
  certInfo,
  p12File,
  draftSaved,
  msg,
  saving,
  onSubmit,
  onSet,
  onP12File,
}: FiscalFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-[var(--hc-border)] bg-[var(--hc-surface)] p-6 shadow-sm">

      <div>
        <label htmlFor="fiscal-ambiente" className="block text-sm font-medium text-[var(--hc-text)] mb-1">
          Ambiente Hacienda
        </label>
        <select id="fiscal-ambiente"
          value={form.ambienteHacienda}
          onChange={e => onSet('ambienteHacienda', e.target.value)}
          className="w-full rounded-xl border border-[var(--hc-border)] bg-[var(--hc-surface)] px-3 py-2 text-sm text-[var(--hc-text)]"
        >
          {AMBIENTES.map(o => (
            <option key={o.v} value={o.v} disabled={o.v === 'PROD' && !isAdmin}>
              {o.l}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="fiscal-tipo-cedula" className="block text-sm font-medium text-[var(--hc-text)] mb-1">Tipo cédula</label>
          <select id="fiscal-tipo-cedula"
            value={form.tipoCedula}
            onChange={e => onSet('tipoCedula', e.target.value)}
            className="w-full rounded-xl border border-[var(--hc-border)] bg-[var(--hc-surface)] px-3 py-2 text-sm text-[var(--hc-text)]"
          >
            {TIPOS_CEDULA.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="fiscal-cedula" className="block text-sm font-medium text-[var(--hc-text)] mb-1">Número de cédula / RUC</label>
          <input id="fiscal-cedula"
            value={form.cedulaJuridica}
            onChange={e => onSet('cedulaJuridica', e.target.value)}
            placeholder="3-101-123456"
            className="w-full rounded-xl border border-[var(--hc-border)] bg-[var(--hc-surface)] px-3 py-2 text-sm text-[var(--hc-text)]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="fiscal-actividad" className="block text-sm font-medium text-[var(--hc-text)] mb-1">
          Código actividad económica (CIIU)
        </label>
        <input id="fiscal-actividad"
          value={form.actividadEconomica}
          onChange={e => onSet('actividadEconomica', e.target.value)}
          placeholder="ej. 4791"
          className="w-full rounded-xl border border-[var(--hc-border)] bg-[var(--hc-surface)] px-3 py-2 text-sm text-[var(--hc-text)]"
        />
      </div>

      <div>
        <label htmlFor="fiscal-nombre-comercial" className="block text-sm font-medium text-[var(--hc-text)] mb-1">
          Nombre comercial (en el comprobante)
        </label>
        <input id="fiscal-nombre-comercial"
          value={form.nombreComercialFe}
          onChange={e => onSet('nombreComercialFe', e.target.value)}
          placeholder="Nombre que aparece en la factura"
          className="w-full rounded-xl border border-[var(--hc-border)] bg-[var(--hc-surface)] px-3 py-2 text-sm text-[var(--hc-text)]"
        />
      </div>

      <hr className="border-[var(--hc-border)]" />
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hc-text-disabled)]">Credenciales ATV (Hacienda)</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="fiscal-usuario-atv" className="block text-sm font-medium text-[var(--hc-text)] mb-1">Usuario ATV</label>
          <input id="fiscal-usuario-atv"
            value={form.usuarioHacienda}
            onChange={e => onSet('usuarioHacienda', e.target.value)}
            placeholder="usuario@empresa.com"
            className="w-full rounded-xl border border-[var(--hc-border)] bg-[var(--hc-surface)] px-3 py-2 text-sm text-[var(--hc-text)]"
          />
        </div>
        <div>
          <label htmlFor="fiscal-clave-atv" className="block text-sm font-medium text-[var(--hc-text)] mb-1">
            Clave ATV
            {certInfo.tieneClaveHacienda && (
              <span className="ml-2 text-xs text-[var(--hc-success)] font-normal">configurada</span>
            )}
          </label>
          <input id="fiscal-clave-atv"
            type="password"
            value={form.claveHacienda}
            onChange={e => onSet('claveHacienda', e.target.value)}
            placeholder={certInfo.tieneClaveHacienda ? '(dejar vacío para no cambiar)' : 'Ingresá tu clave ATV'}
            className="w-full rounded-xl border border-[var(--hc-border)] bg-[var(--hc-surface)] px-3 py-2 text-sm text-[var(--hc-text)]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="fiscal-cert-p12" className="block text-sm font-medium text-[var(--hc-text)] mb-1">
          Certificado PKCS#12 (.p12)
          {certInfo.tieneCertP12 && (
            <span className="ml-2 text-xs text-[var(--hc-success)] font-normal">cargado</span>
          )}
        </label>
        <input id="fiscal-cert-p12"
          type="file"
          accept=".p12,.pfx"
          onChange={e => onP12File(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[var(--hc-muted)] file:mr-3 file:rounded-lg file:border-0
            file:bg-[var(--hc-info-bg)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--hc-link)]
            hover:file:bg-[var(--hc-blue-100)]"
        />
        {p12File && (
          <p className="mt-1 text-xs text-[var(--hc-warning)]">
            Archivo listo: {p12File.name} ({(p12File.size / 1024).toFixed(1)} KB)
          </p>
        )}
        {!p12File && (
          <p className="mt-1 text-xs text-[var(--hc-text-disabled)]">
            {certInfo.tieneCertP12
              ? 'Solo subir si necesitás reemplazar el certificado actual.'
              : 'Subí tu archivo .p12 emitido por SINPE o Bansaseguros.'}
          </p>
        )}
      </div>

      {draftSaved && (
        <p className="text-xs text-[var(--hc-text-disabled)] italic">Borrador guardado automáticamente.</p>
      )}

      {msg && (
        <p className={`rounded-lg px-4 py-2 text-sm ${msg.ok
          ? 'bg-[var(--hc-success-bg)] text-[var(--hc-success)]'
          : 'bg-[var(--hc-danger-bg)] text-[var(--hc-danger)]'
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
  )
}
