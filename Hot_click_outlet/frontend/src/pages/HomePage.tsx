import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { productService } from '@/services/productService'
import useChatStore from '@/store/chatStore'
import Chip from '@/components/comprador/Chip'
import ProductCard from '@/components/comprador/ProductCard'
import CategoryTile from '@/components/comprador/CategoryTile'
import { useCategoriasCatalogo } from '@/components/comprador/useCategoriasCatalogo'
import { rutaCategoria } from '@/components/comprador/header/useHeaderComprador'
import PantallaFalloServidor from '@/components/comprador/estados/PantallaFalloServidor'
import { esFalloServidor, referenciaDelError } from '@/components/comprador/estados/falloServidorHelpers'
import PantallaSinConexion from '@/components/comprador/estados/PantallaSinConexion'
import { esSinConexion } from '@/components/comprador/estados/conexionHelpers'
import TarjetaInstalarApp from '@/components/comprador/instalar/TarjetaInstalarApp'
import type { Producto } from '@/types/producto'
import HomeSeo from './home/HomeSeo'
import EncabezadoSeccion from './home/compra/EncabezadoSeccion'
import TarjetaAsistente from './home/compra/TarjetaAsistente'
import SeguiDondeLoDejaste from './home/compra/SeguiDondeLoDejaste'
import FranjaConfianza from './home/compra/FranjaConfianza'
import {
  CHIPS_ASISTENTE, MAX_CATEGORIAS_HOME, MAX_NUEVOS, elegirDestacados, elegirNuevos,
} from './home/homeCompraHelpers'

const TAMANO_CATALOGO_HOME = 24
const VIGENCIA_MS = 60_000

function listaDePagina(data: unknown): Producto[] {
  if (Array.isArray(data)) return data as Producto[]
  if (data && typeof data === 'object' && 'content' in data) return (data as { content: Producto[] }).content ?? []
  return []
}

export default function HomePage() {
  const { t } = useTranslation()
  const abrirChat = useChatStore((s) => s.open)
  const { categorias } = useCategoriasCatalogo()

  const destacadosQuery = useQuery({
    queryKey: ['home', 'destacados'],
    queryFn: () => productService.getDestacados().then((r) => r.data),
    staleTime: VIGENCIA_MS,
  })
  const catalogoQuery = useQuery({
    queryKey: ['home', 'catalogo', TAMANO_CATALOGO_HOME],
    queryFn: () => productService.getAll(0, TAMANO_CATALOGO_HOME).then((r) => listaDePagina(r.data)),
    staleTime: VIGENCIA_MS,
  })

  const catalogo = catalogoQuery.data ?? []
  const destacados = elegirDestacados(destacadosQuery.data ?? [], catalogo)
  const nuevos = elegirNuevos(catalogo, destacados, MAX_NUEVOS)
  const preguntar = (texto: string) => abrirChat(texto)
  const referenciaFallo = useMemo(() => referenciaDelError(catalogoQuery.error), [catalogoQuery.error])

  const sinDatos = catalogo.length === 0 && destacados.length === 0
  const reintentar = () => { void catalogoQuery.refetch(); void destacadosQuery.refetch() }
  const falloServidor = esFalloServidor(catalogoQuery.error) && sinDatos
  if (falloServidor) {
    return <PantallaFalloServidor referencia={referenciaFallo} onReintentar={reintentar} />
  }
  const sinConexion = (esSinConexion(catalogoQuery.error) || esSinConexion(destacadosQuery.error)) && sinDatos
  if (sinConexion) return <PantallaSinConexion onReintentar={reintentar} />

  return (
    <MainLayout>
      <HomeSeo destacados={destacados} />

      <section
        aria-labelledby="home-titulo"
        className="hc-banda-home flex flex-col lg:flex-row lg:gap-14 lg:px-8 lg:pb-10 lg:pt-9 xl:px-[max(120px,calc((100%_-_1200px)/2))]"
      >
        <div className="flex flex-col gap-3 bg-hc-n-0 py-[18px] lg:w-[420px] lg:shrink-0 lg:gap-4 lg:bg-transparent lg:p-0">
          <div className="flex flex-col gap-1 px-4 lg:gap-4 lg:px-0">
            <h1 id="home-titulo" className="font-display text-[22px] font-bold leading-[28px] tracking-normal text-hc-n-900 [text-wrap:wrap] lg:text-[36px] lg:leading-[42px]">
              {t('home.compra.titulo')}
            </h1>
            <p className="text-[13px] leading-[18px] text-hc-n-600 lg:text-[15px] lg:leading-[22px]">
              <span className="lg:hidden">{t('home.compra.subtituloMovil')}</span>
              <span className="hidden lg:inline">{t('home.compra.subtitulo')}</span>
            </p>
          </div>
          {categorias.length > 0 && (
            <nav aria-label={t('comprador.header.categoriasAria')} className="hidden flex-wrap gap-2 lg:flex">
              {categorias.slice(0, 5).map((c) => <Chip key={c.id} texto={c.nombre} to={rutaCategoria(c.id)} />)}
            </nav>
          )}
          <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden">
            {CHIPS_ASISTENTE.map((clave) => (
              <Chip key={clave} texto={t(clave)} variante="asistente" onClick={() => preguntar(t(clave))} />
            ))}
          </div>
          <TarjetaAsistente variante="hero" onPreguntar={preguntar} className="hidden lg:flex" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 pb-[6px] pt-[22px] lg:gap-4 lg:p-0">
          <div className="px-4 lg:px-0">
            <EncabezadoSeccion
              id="home-destacados"
              titulo={t('home.compra.destacados')}
              tituloDesktop={t('home.compra.destacadosDesktop')}
              accion={{ texto: t('home.compra.verTodo'), to: '/productos' }}
            />
          </div>
          <ul aria-labelledby="home-destacados" className="flex gap-3 overflow-x-auto px-4 [scrollbar-width:none] lg:grid lg:grid-cols-[repeat(4,minmax(0,167px))] lg:justify-between lg:overflow-visible lg:px-0">
            {destacados.map((p, i) => (
              <li key={p.id} className="w-[167px] shrink-0 lg:w-auto">
                <ProductCard product={p} priority={i < 2} className="h-full" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Figma: en móvil "Seguí donde lo dejaste" va antes de categorías (`12:370`); en desktop después (`9:340`, `9:379`). */}
      <div className="flex flex-col">
        <div className="order-1 lg:order-2">
          <SeguiDondeLoDejaste />
        </div>
        {categorias.length > 0 && (
          <section aria-labelledby="home-categorias" className="order-2 flex flex-col gap-[14px] px-4 pb-[6px] pt-6 lg:order-1 lg:gap-[18px] lg:px-8 lg:pb-2 lg:pt-11 xl:px-[max(120px,calc((100%_-_1200px)/2))]">
            <EncabezadoSeccion
              id="home-categorias"
              titulo={t('home.compra.categorias')}
              accion={{ texto: t('home.compra.todas'), textoDesktop: t('home.compra.todasDesktop'), to: '/categorias' }}
            />
            <ul className="grid grid-cols-[repeat(2,minmax(0,167px))] justify-between gap-y-[18px] sm:grid-cols-[repeat(auto-fill,167px)] sm:justify-start sm:gap-x-4 lg:grid-cols-[repeat(6,minmax(0,167px))] lg:justify-between lg:gap-x-4">
              {categorias.slice(0, MAX_CATEGORIAS_HOME).map((c) => (
                <li key={c.id}>
                  <CategoryTile nombre={c.nombre} cantidad={c.cantidad} fotoUrl={c.fotoUrl} to={rutaCategoria(c.id)} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section aria-label={t('home.compra.asistenteTitulo')} className="px-4 pb-[6px] pt-6 lg:hidden">
        <TarjetaAsistente variante="seccion" onPreguntar={preguntar} />
      </section>

      {nuevos.length > 0 && (
        <section aria-labelledby="home-nuevos" className="flex flex-col gap-[14px] px-4 pb-[6px] pt-6 lg:gap-[18px] lg:px-8 lg:pb-2 lg:pt-11 xl:px-[max(120px,calc((100%_-_1200px)/2))]">
          <EncabezadoSeccion
            id="home-nuevos"
            titulo={t('home.compra.nuevos')}
            accion={{ texto: t('home.compra.verTodo'), textoDesktop: t('home.compra.verCatalogo'), to: '/productos' }}
          />
          <ul className="grid grid-cols-[repeat(2,minmax(0,167px))] justify-between gap-y-4 sm:grid-cols-[repeat(auto-fill,167px)] sm:justify-start sm:gap-x-4 lg:grid-cols-[repeat(6,minmax(0,167px))] lg:justify-between lg:gap-x-4">
            {nuevos.map((p, i) => (
              <li key={p.id} className={i >= 4 ? 'hidden lg:block' : undefined}>
                <ProductCard product={p} className="h-full" />
              </li>
            ))}
          </ul>
          <Link
            to="/productos"
            className="flex items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 py-[13px] text-[14px] font-semibold leading-[normal] text-hc-n-900 lg:hidden"
          >
            {t('home.compra.verCatalogo')}
          </Link>
        </section>
      )}

      <FranjaConfianza />
      <TarjetaInstalarApp />
    </MainLayout>
  )
}
