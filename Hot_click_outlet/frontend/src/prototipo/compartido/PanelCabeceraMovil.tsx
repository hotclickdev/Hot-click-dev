import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BellIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import BrandLogo from '@/components/ui/BrandLogo'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { rutaConPrefijo, rutaCuentaSeller } from '@/utils/planPaths'
import { etiquetaPlan } from './planesPageHelpers'

type Props = Readonly<{
  /** Prefijo del panel del plan: `/emprendedor`, `/pyme` o `/negocio-plus`. */
  base: string
  /** Nombre del plan en la API (`EMPRENDEDOR`, `PYME`, `NEGOCIO_PLUS`). */
  planApi: string
  /** En pantallas internas el logo se cambia por la flecha de volver. */
  interna: boolean
}>

const ALTO_PUNTO_TACTIL = 'size-11'

/** Vuelve a donde estaba el usuario; si entró directo a la pantalla, va al Inicio del panel. */
function useVolverAlPanel(base: string) {
  const navigate = useNavigate()
  return function volver() {
    const posicion = (globalThis.history.state as { idx?: number } | null)?.idx ?? 0
    if (posicion > 0) navigate(-1)
    else navigate(base)
  }
}

/**
 * Única cabecera del panel del vendedor en celular (56 px): logo o flecha de volver,
 * tienda con el plan, campana y avatar. Reemplaza «Tu negocio» y el modo oscuro (ahora en Opciones).
 */
export default function PanelCabeceraMovil({ base, planApi, interna }: Props) {
  const empresaId = useAuthStore((s) => s.empresaId)
  const empresaNombre = useAuthStore((s) => s.empresaNombre)
  const userName = useAuthStore((s) => s.userName)
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const volver = useVolverAlPanel(base)

  useEffect(() => {
    if (empresaId) void loadTenantInfo()
  }, [empresaId, loadTenantInfo])

  const rutaNotificaciones = rutaConPrefijo(base, rutaCuentaSeller(planApi, 'notificaciones'))
  const rutaOpciones = rutaConPrefijo(base, 'opciones')

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-hc-border bg-hc-surface px-3 md:hidden"
      data-testid="panel-cabecera-movil"
    >
      {interna ? (
        <button
          type="button"
          onClick={volver}
          className={`${ALTO_PUNTO_TACTIL} flex shrink-0 items-center justify-center text-hc-primary`}
          aria-label="Volver"
        >
          <ChevronLeftIcon className="size-6" aria-hidden />
        </button>
      ) : (
        <Link to={base} className="flex min-h-11 shrink-0 items-center pl-1" aria-label="HotClick, ir al Inicio">
          <BrandLogo size={22} wordmarkSize={15} />
        </Link>
      )}
      <div className="min-w-0 flex-1 px-1.5" data-mm="negocio-pertenencia">
        <p className="truncate text-[13px] font-semibold leading-tight text-hc-text">{empresaNombre ?? 'Tu negocio'}</p>
        <span className="mt-0.5 inline-flex rounded-full bg-[var(--hc-info-bg)] px-2 py-0.5 text-[10px] font-semibold leading-none text-[var(--hc-info)]">
          {etiquetaPlan(planApi)}
        </span>
      </div>
      <Link
        to={rutaNotificaciones}
        className={`${ALTO_PUNTO_TACTIL} flex shrink-0 items-center justify-center text-hc-text`}
        aria-label="Notificaciones"
      >
        <BellIcon className="size-6" aria-hidden />
      </Link>
      <Link
        to={rutaOpciones}
        className={`${ALTO_PUNTO_TACTIL} flex shrink-0 items-center justify-center`}
        aria-label="Opciones de tu cuenta"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-[var(--hc-info)] text-xs font-bold text-white">
          {(userName ?? empresaNombre ?? 'T').slice(0, 1).toUpperCase()}
        </span>
      </Link>
    </header>
  )
}
