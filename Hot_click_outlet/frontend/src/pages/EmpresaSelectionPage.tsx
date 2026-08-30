import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import TrustGlyph from '@/components/ui/TrustGlyph'
import { mensajeErrorAuth } from './auth/authHelpers'
import { rutaPanelPorRol } from '@/utils/planPaths'
import type { AuthResponse } from '@/types/auth'
import type { Id } from '@/types/api'

type EmpresaOpcion = {
  id: Id
  nombre?: string
  slug?: string
  logoUrl?: string | null
  estadoEmpresa?: string
}

type EmpresaSelectionState = {
  empresas?: EmpresaOpcion[]
  tempToken?: string
}

export default function EmpresaSelectionPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const loginStore = useAuthStore((s) => s.login)

  // Data passed from LoginPage via router state
  const { empresas = [], tempToken = '' } = (location.state ?? {}) as EmpresaSelectionState

  const [loading, setLoading] = useState<Id | null>(null) // empresaId being loaded
  const [error, setError]     = useState<string | null>(null)

  async function seleccionar(empresa: EmpresaOpcion) {
    setLoading(empresa.id)
    setError(null)
    try {
      const { data } = await authService.seleccionarEmpresa(tempToken, empresa.id)
      // Response is AuthResponse (no ResponseDTO wrapper for this endpoint)
      const authData = (data as AuthResponse & { data?: AuthResponse })?.data ?? (data as AuthResponse)
      loginStore(authData)
      if (authData.empresaId) {
        await useTenantStore.getState().loadTenantInfo()
      }
      navigate(rutaPanelPorRol(authData.rol, useTenantStore.getState().planNombre), { replace: true })
    } catch (err: unknown) {
      setError(mensajeErrorAuth(err, 'Error al seleccionar el negocio'))
      setLoading(null)
    }
  }

  if (!tempToken || empresas.length === 0) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--hc-bg)' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ backgroundColor: 'var(--hc-accent)' }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
            Seleccioná tu negocio
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--hc-muted)' }}>
            Tenés acceso a {empresas.length} negocios. ¿A cuál entrás hoy?
          </p>
        </div>

        {/* Empresa cards */}
        <div className="space-y-3">
          {empresas.map((emp) => (
            <button type="button"
              key={emp.id}
              onClick={() => seleccionar(emp)}
              disabled={loading !== null}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all disabled:opacity-60"
              style={{
                backgroundColor: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--hc-accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hc-border)' }}
            >
              {/* Logo */}
              <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                {emp.logoUrl
                  ? <img src={emp.logoUrl} alt={emp.nombre} className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold" style={{ color: 'var(--hc-accent)' }}>
                      {emp.nombre?.charAt(0)?.toUpperCase()}
                    </span>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate" style={{ color: 'var(--hc-text)' }}>
                  {emp.nombre}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
                    @{emp.slug}
                  </span>
                  {emp.estadoEmpresa === 'PENDIENTE_APROBACION' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">
                      Pendiente aprobación
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow / spinner */}
              <div className="shrink-0" style={{ color: 'var(--hc-muted)' }}>
                {loading === emp.id
                  ? <div className="w-5 h-5 border-2 rounded-full animate-spin"
                      style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
                  : <TrustGlyph tipo="adelante" className="w-5 h-5" />
                }
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-sm text-center text-red-400">{error}</p>
        )}

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--hc-muted)' }}>
          Podés cambiar de negocio en cualquier momento desde tu perfil.
        </p>
      </div>
    </div>
  )
}
