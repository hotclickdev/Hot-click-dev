import { useState, useEffect } from 'react'
import { adminService } from '@/services/orderService'
import { flagService } from '@/services/flagService'

const FLAG_LABELS = {
  facturacion_electronica: 'Facturación Electrónica CR',
  ai_copilot:              'AI Copilot (Claude)',
  ai_forecast:             'AI Forecast de demanda',
  mobile_pos:              'Mobile POS (PWA offline)',
  self_checkout:           'Self-Checkout QR',
  split_payments:          'Pagos divididos / Gift Cards',
  marketplace_plugins:     'Marketplace de Plugins',
  white_label:             'White Label (branding custom)',
}

export default function AdminSuperAdmin() {
  const [empresas, setEmpresas]     = useState([])
  const [flags, setFlags]           = useState([])
  const [selected, setSelected]     = useState(null)   // empresa seleccionada
  const [estadoFlags, setEstadoFlags] = useState([])
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(null)   // flagNombre en proceso

  useEffect(() => {
    adminService.getEmpresas().then(r => setEmpresas(r.data ?? [])).catch((err) => { console.error('[AdminSuperAdmin] empresas', err) })
    flagService.list().then(r => setFlags(r.data ?? [])).catch((err) => { console.error('[AdminSuperAdmin] flags', err) })
  }, [])

  const cargarFlags = async (empresa) => {
    setSelected(empresa)
    setLoading(true)
    try {
      const { data } = await flagService.getByEmpresa(empresa.id)
      setEstadoFlags(data ?? [])
    } finally {
      setLoading(false)
    }
  }

  const toggleFlag = async (flagNombre, activo) => {
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Panel exclusivo ADMIN — gestión de planes y feature flags por empresa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna izquierda: lista de empresas */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Empresas</h2>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {empresas.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-gray-400">Sin empresas</li>
              )}
              {empresas.map(e => (
                <li key={e.id}>
                  <button type="button"
                    onClick={() => cargarFlags(e)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      selected?.id === e.id ? 'bg-[var(--hc-info-bg)] dark:bg-[var(--hc-info-bg)]' : ''
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{e.nombreEmpresa}</p>
                    <p className="text-xs text-gray-400">{e.planSaas ?? 'FREE'} · {e.estadoEmpresa}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Columna derecha: flags de la empresa seleccionada */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                {selected ? `Feature flags — ${selected.nombreEmpresa}` : 'Selecciona una empresa'}
              </h2>
            </div>

            {!selected && (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                ← Selecciona una empresa para gestionar sus flags
              </div>
            )}

            {selected && loading && (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                Cargando…
              </div>
            )}

            {selected && !loading && (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {estadoFlags.map(flag => {
                  const label   = FLAG_LABELS[flag.nombre] ?? flag.nombre
                  const activo  = !!flag.activo
                  const isBusy  = saving === flag.nombre

                  return (
                    <li key={flag.nombre} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{label}</p>
                        <p className="truncate text-xs text-gray-400">{flag.nombre}</p>
                      </div>

                      {flag.fechaExp && (
                        <span className="hidden rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 sm:inline">
                          exp: {flag.fechaExp?.substring(0, 10)}
                        </span>
                      )}

                      {/* Toggle */}
                      <button type="button"
                        onClick={() => toggleFlag(flag.nombre, activo)}
                        disabled={isBusy}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--hc-focus-ring)]
                          ${activo ? 'bg-[var(--hc-accent)]' : 'bg-gray-200 dark:bg-gray-600'}
                          ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={activo ? 'Desactivar' : 'Activar'}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                          transition duration-200 ${activo ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </li>
                  )
                })}

                {estadoFlags.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-gray-400">
                    No hay flags configurados
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Registro global de flags */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Registro global de flags</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">Descripción</th>
                    <th className="px-4 py-2 text-left">Defecto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {flags.map(f => (
                    <tr key={f.nombre} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{f.nombre}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{f.descripcion}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          f.activoDefecto
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
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
