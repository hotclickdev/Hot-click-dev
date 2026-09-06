import { useState, useEffect } from 'react'
import { adminService } from '@/services/orderService'
import { flagService } from '@/services/flagService'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { Id } from '@/types/api'

type EmpresaFlag = {
  id: Id
  nombreEmpresa?: string
  planSaas?: string
  estadoEmpresa?: string
}

type FlagRegistro = {
  nombre: string
  descripcion?: string
  activoDefecto?: boolean
}

type FlagEmpresa = {
  nombre: string
  activo?: boolean
  fechaExp?: string | null
}

const FLAG_LABELS: Record<string, string> = {
  facturacion_electronica: 'Facturación Electrónica CR',
  ai_copilot:              'AI Copilot (Claude)',
  ai_forecast:             'AI Forecast de demanda',
  mobile_pos:              'Mobile POS (PWA offline)',
  self_checkout:           'Self-Checkout QR',
  split_payments:          'Pagos divididos',
  marketplace_plugins:     'Marketplace de Plugins',
  white_label:             'White Label (branding custom)',
}

function listaOVacio<T>(data: unknown): T[] {
  return (data as T[] | undefined) ?? []
}

export default function AdminSuperAdmin() {
  const [empresas, setEmpresas]     = useState<EmpresaFlag[]>([])
  const [flags, setFlags]           = useState<FlagRegistro[]>([])
  const [selected, setSelected]     = useState<EmpresaFlag | null>(null)   // empresa seleccionada
  const [estadoFlags, setEstadoFlags] = useState<FlagEmpresa[]>([])
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState<string | null>(null)   // flagNombre en proceso

  useEffect(() => {
    adminService.getEmpresas().then(r => setEmpresas(listaOVacio<EmpresaFlag>(r.data))).catch((err: unknown) => { console.error('[AdminSuperAdmin] empresas', err) })
    flagService.list().then(r => setFlags(listaOVacio<FlagRegistro>(r.data))).catch((err: unknown) => { console.error('[AdminSuperAdmin] flags', err) })
  }, [])

  const cargarFlags = async (empresa: EmpresaFlag) => {
    setSelected(empresa)
    setLoading(true)
    try {
      const { data } = await flagService.getByEmpresa(empresa.id)
      setEstadoFlags(listaOVacio<FlagEmpresa>(data))
    } finally {
      setLoading(false)
    }
  }

  const toggleFlag = async (flagNombre: string, activo: boolean) => {
    if (!selected) return
    setSaving(flagNombre)
    try {
      await flagService.set(selected.id, flagNombre, !activo)
      setEstadoFlags(prev =>
        prev.map(f => f.nombre === flagNombre ? { ...f, activo: !activo } : f)
      )
    } catch {
      // mantenido por GlobalExceptionHandler
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="font-[var(--hc-font-display)] text-2xl font-bold text-[var(--hc-text)]">Super Admin</h1>
        <p className="text-sm text-[var(--hc-muted)]">
          Panel exclusivo ADMIN — gestión de planes y feature flags por empresa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna izquierda: lista de empresas */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[var(--hc-border)] bg-[var(--hc-surface)] shadow-sm">
            <div className="border-b border-[var(--hc-border)] px-4 py-3">
              <h2 className="font-semibold text-[var(--hc-text)]">Empresas</h2>
            </div>
            <ul className="divide-y divide-[var(--hc-border)]">
              {empresas.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-[var(--hc-text-disabled)]">Sin empresas</li>
              )}
              {empresas.map(e => (
                <li key={e.id}>
                  <button type="button"
                    onClick={() => cargarFlags(e)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-[var(--hc-surface-2)] ${
                      selected?.id === e.id ? 'bg-[var(--hc-info-bg)]' : ''
                    }`}
                  >
                    <p className="font-medium text-[var(--hc-text)]">{e.nombreEmpresa}</p>
                    <p className="text-xs text-[var(--hc-text-disabled)]">{e.planSaas ?? 'FREE'} · {e.estadoEmpresa}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Columna derecha: flags de la empresa seleccionada */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--hc-border)] bg-[var(--hc-surface)] shadow-sm">
            <div className="border-b border-[var(--hc-border)] px-4 py-3">
              <h2 className="font-semibold text-[var(--hc-text)]">
                {selected ? `Feature flags — ${selected.nombreEmpresa}` : 'Selecciona una empresa'}
              </h2>
            </div>

            {!selected && (
              <div className="flex items-center justify-center py-16 text-sm text-[var(--hc-text-disabled)]">
                <TextoFlecha dir="atras">Selecciona una empresa para gestionar sus flags</TextoFlecha>
              </div>
            )}

            {selected && loading && (
              <div className="flex items-center justify-center py-16 text-sm text-[var(--hc-text-disabled)]">
                Cargando…
              </div>
            )}

            {selected && !loading && (
              <ul className="divide-y divide-[var(--hc-border)]">
                {estadoFlags.map(flag => {
                  const label   = FLAG_LABELS[flag.nombre] ?? flag.nombre
                  const activo  = !!flag.activo
                  const isBusy  = saving === flag.nombre

                  return (
                    <li key={flag.nombre} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--hc-text)]">{label}</p>
                        <p className="truncate text-xs text-[var(--hc-text-disabled)]">{flag.nombre}</p>
                      </div>

                      {flag.fechaExp && (
                        <span className="hidden rounded bg-[var(--hc-warning-bg)] px-2 py-0.5 text-xs text-[var(--hc-warning)] sm:inline">
                          exp: {flag.fechaExp?.substring(0, 10)}
                        </span>
                      )}

                      {/* Toggle */}
                      <button type="button"
                        onClick={() => toggleFlag(flag.nombre, activo)}
                        disabled={isBusy}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--hc-focus-ring)]
                          ${activo ? 'bg-[var(--hc-accent)]' : 'bg-[var(--hc-border-strong)]'}
                          ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={activo ? 'Desactivar' : 'Activar'}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white hc-papel-blanco shadow ring-0
                          transition duration-200 ${activo ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </li>
                  )
                })}

                {estadoFlags.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-[var(--hc-text-disabled)]">
                    No hay flags configurados
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Registro global de flags */}
          <div className="mt-4 rounded-2xl border border-[var(--hc-border)] bg-[var(--hc-surface)] shadow-sm">
            <div className="border-b border-[var(--hc-border)] px-4 py-3">
              <h2 className="font-semibold text-[var(--hc-text)]">Registro global de flags</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead className="bg-[var(--hc-surface-2)] text-xs text-[var(--hc-muted)]">
                  <tr>
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">Descripción</th>
                    <th className="px-4 py-2 text-left">Defecto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hc-border)]">
                  {flags.map(f => (
                    <tr key={f.nombre} className="hover:bg-[var(--hc-surface-2)]">
                      <td className="px-4 py-2 font-mono text-xs text-[var(--hc-text)]">{f.nombre}</td>
                      <td className="px-4 py-2 text-[var(--hc-muted)]">{f.descripcion}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          f.activoDefecto
                            ? 'bg-[var(--hc-success-bg)] text-[var(--hc-success)]'
                            : 'bg-[var(--hc-surface-3)] text-[var(--hc-muted)]'
                        }`}>
                          {f.activoDefecto ? 'ON' : 'OFF'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
