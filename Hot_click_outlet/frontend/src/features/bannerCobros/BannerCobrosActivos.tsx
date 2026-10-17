import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { bannerCobrosApi, claveCerrado, debeMostrarBanner, rutaMisCobros, type EstadoOnvo } from './bannerCobrosApi'

function leerCerrado(clave: string): boolean {
  try { return localStorage.getItem(clave) === '1' } catch { return false }
}

/** S6-20 · Aviso en el flujo del contenido (no flota ni tapa botones). Lámina: diseno/sprint6/S6-20. */
export default function BannerCobrosActivos() {
  const empresaId = useAuthStore((s) => s.empresaId)
  const estadoEmpresa = useTenantStore((s) => s.estadoEmpresa)
  const visibilidadPublica = useTenantStore((s) => s.visibilidadPublica)
  const { pathname } = useLocation()
  const [estadoOnvo, setEstadoOnvo] = useState<EstadoOnvo | null>(null)
  const [cerrado, setCerrado] = useState(false)

  useEffect(() => {
    if (!empresaId) return
    setCerrado(leerCerrado(claveCerrado(empresaId)))
    let vivo = true
    bannerCobrosApi.estado().then((e) => { if (vivo) setEstadoOnvo(e) }).catch(() => { if (vivo) setEstadoOnvo(null) })
    return () => { vivo = false }
  }, [empresaId])

  if (!empresaId || !debeMostrarBanner({ estadoEmpresa, visibilidadPublica, estadoOnvo, cerrado })) return null

  const cerrar = () => {
    try { localStorage.setItem(claveCerrado(empresaId), '1') } catch { /* sin storage: solo se oculta en esta vista */ }
    setCerrado(true)
  }

  return (
    <section
      role="status"
      aria-labelledby="banner-cobros-titulo"
      className="mx-5 mb-4 flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
      style={{ background: 'var(--hc-info-bg)', color: 'var(--hc-text)', border: '1px solid var(--hc-info)' }}
    >
      <span aria-hidden="true" style={{ color: 'var(--hc-info)' }}>✓</span>
      <div className="flex-1">
        <p id="banner-cobros-titulo" className="font-semibold">Ya podés cobrar en línea</p>
        <p className="mt-1">Tus clientes ya pueden pagar con tarjeta o SINPE Móvil dentro de ONVO.</p>
        <Link to={rutaMisCobros(pathname)} className="mt-1 inline-flex min-h-11 items-center font-semibold underline" style={{ color: 'var(--hc-info)' }}>
          Ver mis cobros
        </Link>
      </div>
      <button type="button" onClick={cerrar} aria-label="Cerrar aviso de cobros en línea" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
        <span aria-hidden="true">✕</span>
      </button>
    </section>
  )
}
