import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { getAvailableModes, MODE_PREF_KEY } from '@/utils/modes'
import useTenantStore from '@/store/tenantStore'
import { estiloHueco, estiloTooltip, rectDeAncla, type MmRect } from './mmOverlay'
import {
  autoSpotlightOmitido,
  esRutaConCoach,
  esRutaVendedor,
  guiaPara,
  marcarPantallaVista,
  marcarWelcomeHecho,
  marcarWelcomeSellerHecho,
  mmApagado,
  welcomeHecho,
  welcomeSellerHecho,
  type MmPaso,
} from './mmRegistry'

type Fase = 'idle' | 'welcome' | 'modos' | 'spotlight'

/**
 * Coach Mental Model: bienvenida + spotlight por pantalla (máx 3 focos).
 * En vendedor se dispara al entrar a cada pestaña (si no está apagado en Opciones).
 */
export default function MentalModelCoach() {
  const location = useLocation()
  const navigate = useNavigate()
  const userRole = useAuthStore((s) => s.userRole)
  const userName = useAuthStore((s) => s.userName)
  const permissions = useAuthStore((s) => s.permissions)
  const empresaSlug = useAuthStore((s) => s.empresaSlug)
  const planNombre = useTenantStore((s) => s.planNombre)

  const [fase, setFase] = useState<Fase>('idle')
  const [pasoIdx, setPasoIdx] = useState(0)
  const [pasos, setPasos] = useState<readonly MmPaso[]>([])
  const [rect, setRect] = useState<MmRect | null>(null)
  const [forzar, setForzar] = useState(false)

  const path = location.pathname
  const esSeller = esRutaVendedor(path)

  const recalcular = useCallback((ancla: string) => {
    setRect(rectDeAncla(ancla))
  }, [])

  const cerrarSpotlight = useCallback(() => {
    marcarPantallaVista(path)
    setFase('idle')
    setPasos([])
    setPasoIdx(0)
    setForzar(false)
  }, [path])

  const iniciarSpotlight = useCallback((forzado = false) => {
    if (mmApagado()) return
    const guia = guiaPara(path, userRole)
    if (!guia || guia.pasos.length === 0) return
    if (!forzado && autoSpotlightOmitido(path)) return
    setPasos(guia.pasos.slice(0, 3))
    setPasoIdx(0)
    setFase('spotlight')
    setForzar(forzado)
  }, [path, userRole])

  // Primera visita / cambio de pestaña: welcome (una vez) o spotlight de la ruta.
  useEffect(() => {
    if (mmApagado()) return
    if (!esRutaConCoach(path)) return

    if (esSeller) {
      if (!welcomeSellerHecho()) {
        const t = setTimeout(() => setFase('welcome'), 500)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => iniciarSpotlight(false), 700)
      return () => clearTimeout(t)
    }

    if (!path.startsWith('/admin')) return
    if (!welcomeHecho()) {
      const t = setTimeout(() => setFase('welcome'), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => iniciarSpotlight(false), 800)
    return () => clearTimeout(t)
  }, [path, esSeller, iniciarSpotlight])

  useEffect(() => {
    const handler = () => {
      if (esSeller) marcarWelcomeSellerHecho()
      else marcarWelcomeHecho()
      iniciarSpotlight(true)
    }
    globalThis.addEventListener('hc-open-tour', handler as EventListener)
    return () => globalThis.removeEventListener('hc-open-tour', handler as EventListener)
  }, [iniciarSpotlight, esSeller])

  useEffect(() => {
    if (fase !== 'spotlight' || pasos.length === 0) return
    const ancla = pasos[pasoIdx]?.ancla ?? ''
    recalcular(ancla)
    const onMove = () => recalcular(ancla)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    const id = window.setInterval(onMove, 400)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
      window.clearInterval(id)
    }
  }, [fase, pasoIdx, pasos, recalcular])

  useEffect(() => {
    if (fase === 'idle') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (fase === 'spotlight') {
        cerrarSpotlight()
        return
      }
      if (esSeller) marcarWelcomeSellerHecho()
      else marcarWelcomeHecho()
      setFase('idle')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fase, cerrarSpotlight, esSeller])

  if (fase === 'idle' || mmApagado()) return null

  if (fase === 'welcome' || fase === 'modos') {
    return (
      <WelcomeModal
        fase={fase}
        variante={esSeller ? 'seller' : 'admin'}
        userName={userName}
        modes={getAvailableModes(userRole ?? '', permissions, { empresaSlug, planNombre })}
        onTour={() => {
          if (esSeller) marcarWelcomeSellerHecho()
          else marcarWelcomeHecho()
          iniciarSpotlight(true)
        }}
        onModos={() => setFase('modos')}
        onOmitir={() => {
          if (esSeller) marcarWelcomeSellerHecho()
          else marcarWelcomeHecho()
          marcarPantallaVista(path)
          setFase('idle')
        }}
        onElegirModo={(modePath, modeId) => {
          localStorage.setItem(MODE_PREF_KEY, modeId)
          marcarWelcomeHecho()
          setFase('idle')
          navigate(modePath, { replace: true })
        }}
        onVolver={() => setFase('welcome')}
      />
    )
  }

  const paso = pasos[pasoIdx]
  if (!paso) return null
  const esUltimo = pasoIdx >= pasos.length - 1

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="mm-titulo">
      <div style={estiloHueco(rect)} aria-hidden />
      <div
        className="rounded-2xl border border-hc-border bg-hc-surface p-4 shadow-xl"
        style={estiloTooltip(rect)}
      >
        <p id="mm-titulo" className="text-sm font-bold text-hc-text">{paso.titulo}</p>
        <p className="mt-1 text-xs leading-relaxed text-hc-muted">{paso.texto}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-hc-muted">
            {pasoIdx + 1} / {pasos.length}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={cerrarSpotlight}
              className="min-h-10 rounded-xl bg-hc-surface-2 px-3 text-xs font-medium text-hc-muted"
            >
              Omitir
            </button>
            <button
              type="button"
              onClick={() => {
                if (esUltimo) cerrarSpotlight()
                else setPasoIdx((i) => i + 1)
              }}
              className="min-h-10 rounded-xl bg-hc-primary px-4 text-xs font-bold text-white"
            >
              {esUltimo ? (forzar ? 'Listo' : 'Entendido') : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function WelcomeModal({
  fase,
  variante,
  userName,
  modes,
  onTour,
  onModos,
  onOmitir,
  onElegirModo,
  onVolver,
}: {
  fase: 'welcome' | 'modos'
  variante: 'admin' | 'seller'
  userName: string | null
  modes: { id: string; label: string; sub: string; path: string }[]
  onTour: () => void
  onModos: () => void
  onOmitir: () => void
  onElegirModo: (path: string, id: string) => void
  onVolver: () => void
}) {
  const nombre = userName?.split(' ')[0]
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(20, 23, 28, 0.45)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mm-welcome-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-hc-border bg-hc-surface p-6 shadow-2xl">
        {fase === 'welcome' ? (
          <>
            <h2 id="mm-welcome-title" className="font-display text-xl font-bold text-hc-text md:text-2xl">
              {variante === 'seller'
                ? `Bienvenido${nombre ? `, ${nombre}` : ''} a tu negocio`
                : `Bienvenido${nombre ? `, ${nombre}` : ''} al panel`}
            </h2>
            <p className="mt-2 text-base font-semibold text-hc-text">Hagamos que sea tuyo</p>
            <p className="mt-2 text-sm text-hc-muted">
              {variante === 'seller'
                ? 'En cada pestaña te mostramos paso a paso qué hacer. Podés apagarlo cuando quieras desde Opciones.'
                : 'Te mostramos qué podés hacer en cada pantalla y dónde hacer clic.'}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={onTour}
                className="min-h-12 w-full rounded-[14px] bg-hc-primary text-sm font-bold text-white"
              >
                Empezar guías
              </button>
              {variante === 'admin' ? (
                <button
                  type="button"
                  onClick={onModos}
                  className="min-h-12 w-full rounded-[14px] border border-hc-primary text-sm font-bold text-hc-primary"
                >
                  Elegir qué voy a hacer
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOmitir}
                className="min-h-10 text-sm font-medium text-hc-muted hover:text-hc-text"
              >
                Omitir por ahora
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="mm-welcome-title" className="font-display text-xl font-bold text-hc-text">
              ¿Qué vas a hacer hoy?
            </h2>
            <p className="mt-2 text-sm text-hc-muted">
              Tu rol no cambia: solo elegís por dónde entrar.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {modes.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onElegirModo(m.path, m.id)}
                    className="flex w-full flex-col rounded-xl border border-hc-border bg-hc-surface-2 px-4 py-3 text-left hover:border-hc-primary"
                  >
                    <span className="text-sm font-bold text-hc-text">{m.label}</span>
                    {m.sub ? <span className="text-xs text-hc-muted">{m.sub}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onVolver}
              className="mt-4 min-h-10 w-full text-sm font-medium text-hc-muted"
            >
              Volver
            </button>
          </>
        )}
      </div>
    </div>
  )
}
