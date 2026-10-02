import { useLayoutEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HeaderComprador from '@/components/comprador/header/HeaderComprador'
import type { DestinoAtras, EncabezadoEscritorio, EncabezadoMovil } from '@/components/comprador/header/tiposHeader'
import BarraInferior from '@/components/comprador/BarraInferior'
import FooterComprador from '@/components/comprador/FooterComprador'
import { esRutaClaudeclick } from '@/utils/rutaPrototipo'
import { esRutaTienda } from '@/utils/rutaTienda'
import { publicarBarraInferior } from '@/components/ui/flotantes/barraInferiorStore'
import {
  ESPACIO_BAJO_BARRA,
  ESPACIO_BAJO_PIE_MOVIL,
  ESPACIO_SIN_BARRA,
  esFichaProducto,
  espacioReservadoMovil,
  whatsappOculto,
} from '@/components/ui/flotantes/flotantesHelpers'
import SearchPanel from '@/components/ui/SearchPanel'
import MiniCartDrawer from '@/components/ui/MiniCartDrawer'
import ExitIntentModal from '@/components/ui/ExitIntentModal'
import PromoWelcomePopup from '@/components/ui/PromoWelcomePopup'
import ReturnVisitorBanner from '@/components/ui/ReturnVisitorBanner'

/** La búsqueda por foto tiene su propia pantalla (Figma de CAT, ruta `/buscar/foto`). */
const RUTA_BUSCAR_CON_FOTO = '/buscar/foto'

type OpcionesComunes = {
  children?: ReactNode
  /** Header desktop. Por defecto `completo`. Es independiente de la variante móvil. */
  encabezadoEscritorio?: EncabezadoEscritorio
  /** Barra inferior móvil. Por defecto: sí, salvo en `interna`. */
  barraInferior?: boolean
  /** Footer con el banner de vendedor. Por defecto sí; fuera de `raiz` solo se ve en desktop. */
  pie?: boolean
  /** Fondo de la página: `gris` (n/50, por defecto) o `blanco` (n/0) donde Figma lo dibuja así: estados vacíos. */
  fondo?: 'gris' | 'blanco'
}

/**
 * Tipo de pantalla según Figma:
 * - `raiz` (por defecto): header global + barra inferior + footer. Home, catálogo.
 * - `interna`: barra propia con flecha atrás y título, sin barra inferior. Ficha, carrito, login, Servicios HOT.
 * - `marca`: barra con solo el logo. 404 y pago exitoso.
 * - `propia`: sin barra superior móvil; la pantalla dibuja la suya (Categorías).
 */
export type MainLayoutProps = OpcionesComunes &
  (
    | { variante?: 'raiz' | 'propia' }
    | { variante: 'interna'; titulo: string; atras?: DestinoAtras; acciones?: ReactNode }
    | { variante: 'marca'; marcaCentrada?: boolean }
  )

const ENCABEZADO_MOVIL: Record<'raiz' | 'interna' | 'marca' | 'propia', EncabezadoMovil> = {
  raiz: 'global',
  interna: 'interno',
  marca: 'marca',
  propia: 'propio',
}

function claseEspacio(px: number): string {
  if (px === ESPACIO_BAJO_PIE_MOVIL) return 'h-[155px] lg:hidden'
  if (px === ESPACIO_SIN_BARRA) return 'h-[88px] lg:hidden'
  if (px === ESPACIO_BAJO_BARRA) return 'h-[72px] lg:hidden'
  return 'h-[72px] lg:hidden'
}

function EspacioFlotante({ px }: { px: number | null }) {
  if (px == null || px === 0) return null
  return <div className={claseEspacio(px)} aria-hidden="true" data-espacio={px} />
}

export default function MainLayout(props: MainLayoutProps) {
  const { children, encabezadoEscritorio = 'completo', pie = true, fondo = 'gris' } = props
  const variante = props.variante ?? 'raiz'
  const barraInferior = props.barraInferior ?? variante !== 'interna'
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fabVisible = !whatsappOculto(pathname, esRutaTienda(pathname), esRutaClaudeclick(pathname)) && !esFichaProducto(pathname)
  const espacio = espacioReservadoMovil({
    hayBarra: barraInferior,
    hayPieMovil: pie && variante === 'raiz',
    fabVisible,
  })

  useLayoutEffect(() => {
    publicarBarraInferior(barraInferior)
    return () => publicarBarraInferior(false)
  }, [barraInferior])

  return (
    <div className={`hc-figma-ui flex min-h-screen flex-col overflow-x-clip ${fondo === 'blanco' ? 'bg-hc-n-0' : 'bg-hc-n-50'}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-hc-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-hc-n-0"
      >
        {t('nav.saltarContenido')}
      </a>
      <HeaderComprador
        onBuscarConFoto={() => navigate(RUTA_BUSCAR_CON_FOTO)}
        movil={ENCABEZADO_MOVIL[variante]}
        escritorio={encabezadoEscritorio}
        barraInterna={props.variante === 'interna' ? { titulo: props.titulo, atras: props.atras, acciones: props.acciones } : undefined}
        marcaCentrada={props.variante === 'marca' ? props.marcaCentrada : undefined}
      />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <ReturnVisitorBanner />
        {children}
      </main>
      {pie && (
        <div className={variante === 'raiz' ? 'mt-auto' : 'mt-auto max-lg:hidden'}>
          <FooterComprador />
        </div>
      )}
      <EspacioFlotante px={espacio} />
      {barraInferior && <BarraInferior />}
      <SearchPanel />
      <MiniCartDrawer />
      <ExitIntentModal />
      <PromoWelcomePopup />
    </div>
  )
}
