import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/authService'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import type { Id } from '@/types/api'
import { activarNegocio, decidirPanelSinNegocio, negociosDe, type NegocioMembresia } from './negociosMembresia'

type Estado = { fase: 'cargando' } | { fase: 'sin-negocio' } | { fase: 'elegir'; negocios: NegocioMembresia[] }

/**
 * Panel de vendedor cuando el token no trae negocio activo.
 * - Con membresías (QA5 área 2 fila 27): selector que activa el negocio con /auth/cambiar-negocio; nunca empuja a
 *   crear un negocio duplicado. Con una sola membresía la activa sola (sesiones viejas emitidas sin empresa).
 * - Sin membresías (registro a medias): único CTA a /registrar-negocio.
 * Diseño derivado de este mismo frame «Completá tu negocio» (Figma TmxYFj2nauu10WZnZ0t6yt, página 4:2): título Sora,
 * texto Public Sans, tarjetas n200 radio 14, CTA rojo radio 12.
 */
export default function CompletaTuNegocio() {
  const { t } = useTranslation()
  const login = useAuthStore((s) => s.login)
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' })
  const [activando, setActivando] = useState<Id | null>(null)
  const [error, setError] = useState('')
  const autoIntentado = useRef(false)

  async function activar(id: Id) {
    setActivando(id); setError('')
    try {
      await activarNegocio(id, {
        cambiarNegocio: authService.cambiarNegocio,
        login,
        cargarTenant: () => useTenantStore.getState().loadTenantInfo(),
      })
    } catch {
      setError(t('completaNegocio.errorActivar'))
      setActivando(null)
    }
  }

  useEffect(() => {
    let vivo = true
    authService.misNegocios()
      .then(({ data }) => {
        if (!vivo) return
        const negocios = negociosDe(data)
        const decision = decidirPanelSinNegocio(negocios)
        setEstado(decision === 'sin-negocio' ? { fase: 'sin-negocio' } : { fase: 'elegir', negocios })
        if (decision === 'auto' && !autoIntentado.current) {
          autoIntentado.current = true
          void activar(negocios[0].id)
        }
      })
      .catch(() => { if (vivo) setEstado({ fase: 'sin-negocio' }) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (estado.fase === 'cargando') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-hc-n-0 px-5">
        <p role="status" className="text-[14px] leading-5 text-hc-n-600">{t('completaNegocio.cargando')}</p>
      </main>
    )
  }

  if (estado.fase === 'elegir') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-hc-n-0 px-5">
        <section aria-labelledby="elegir-negocio-titulo" className="mx-auto flex w-full max-w-[430px] flex-col gap-[10px]">
          <h1 id="elegir-negocio-titulo"
            className="text-center font-display text-[22px] font-bold leading-[28px] text-hc-n-900 [text-wrap:balance]">
            {t('completaNegocio.elegirTitulo')}
          </h1>
          <p className="text-center text-[14px] leading-5 text-hc-n-600">{t('completaNegocio.elegirTexto')}</p>
          <ul className="mt-4 flex flex-col gap-[10px]">
            {estado.negocios.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => activar(n.id)} disabled={activando !== null}
                  className="flex w-full items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-3 text-left hover:border-hc-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hc-blue-600 disabled:opacity-60">
                  <span aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-hc-n-100 font-display text-[16px] font-bold text-hc-n-900">
                    {n.logoUrl ? <img src={n.logoUrl} alt="" className="h-full w-full object-cover" /> : (n.nombre ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-hc-n-900">{n.nombre}</span>
                    {n.slug && <span className="block truncate text-[12px] text-hc-n-600">@{n.slug}</span>}
                  </span>
                  <span className="text-[12px] font-medium text-hc-blue-600">
                    {activando === n.id ? t('completaNegocio.activando') : t('completaNegocio.entrar')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="text-center text-[14px] text-hc-red-600">{error}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-hc-n-0 px-5">
      <section
        aria-labelledby="completa-negocio-titulo"
        className="mx-auto flex w-full max-w-[430px] flex-col items-center gap-[10px] text-center"
      >
        <h1
          id="completa-negocio-titulo"
          className="font-display text-[22px] font-bold leading-[28px] text-hc-n-900 [text-wrap:balance]"
        >
          {t('completaNegocio.titulo')}
        </h1>
        <p className="text-[14px] leading-5 text-hc-n-600">{t('completaNegocio.texto')}</p>
        <Link
          to="/registrar-negocio"
          className="mt-4 w-full rounded-[12px] bg-hc-red-500 px-3 py-[12px] text-[14px] font-semibold text-hc-n-0"
        >
          {t('completaNegocio.cta')}
        </Link>
        <Link to="/" className="py-2 text-[14px] font-medium text-hc-n-600 underline underline-offset-2">
          {t('completaNegocio.volver')}
        </Link>
      </section>
    </main>
  )
}
