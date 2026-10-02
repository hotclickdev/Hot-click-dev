import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { conditionLabel, formatPrice } from '@/utils/format'
import { textoPrecioProducto, tieneOfertaActiva } from '@/utils/precioProducto'
import type { Producto } from '@/types/producto'
import { STOCK_BAJO_MAX, esProductoCotizable } from './productoHelpers'
import { ICONOS_PRODUCTO } from './iconosProducto'
import { EtiquetaAgotado } from './ProductAgotado'

type ProductoCabeceraProps = {
  product: Producto
  agotado: boolean
  /**
   * Estilo móvil de los frames de estado (Figma 44:1775, 44:1849, 44:1917): título antes que el
   * vendedor, precio de 24 px, sin "IVA incluido" ni línea de stock. Sin esto: frame 28:839.
   */
  compacta: boolean
  /** En la cabecera compacta, muestra igual "Quedan N" cuando no hay selector de talla que lo avise. */
  avisoStockCompacta?: boolean
}

const ETIQUETA = 'inline-flex w-fit items-start rounded-full px-2 py-[3px] text-[11px] font-semibold leading-[13px]'

/** Iniciales del vendedor (Figma: "Casa Luna 506" → "CL"). */
function inicialesVendedor(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return ''
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}

function Vendedor({ product, compacta }: { product: Producto; compacta: boolean }) {
  const { t } = useTranslation()
  const nombre = product.empresaNombre
  if (!nombre) return null
  const clases = `flex w-fit items-center lg:order-1 ${compacta ? 'order-2 gap-[6px] lg:gap-2' : 'order-1 gap-2'}`
  const contenido = (
    <>
      <span
        aria-hidden="true"
        className={`${compacta ? 'hidden lg:flex' : 'flex'} size-6 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-[10px] font-bold leading-[normal] text-hc-blue-600 lg:size-7 lg:rounded-lg lg:bg-hc-blue-900 lg:font-display lg:text-[11px] lg:font-extrabold lg:text-hc-n-0`}
      >
        {inicialesVendedor(nombre)}
      </span>
      {compacta && <IconoFigma src={ICONOS_PRODUCTO.tienda} size={14} className="text-hc-blue-600 lg:hidden" />}
      <span className="min-w-0 text-[13px] font-semibold leading-[normal] text-hc-blue-600 wrap-anywhere lg:text-[14px]">{nombre}</span>
      {!compacta && <IconoFigma src={ICONOS_COMPRADOR.verTodo} size={14} className="text-hc-blue-600 lg:hidden" />}
      {product.empresaSlug && (
        <span className="hidden text-[13px] leading-[normal] text-hc-n-600 lg:inline">· {t('product.verTienda')}</span>
      )}
    </>
  )
  if (product.empresaSlug) {
    return <Link to={`/tienda/${product.empresaSlug}`} className={clases}>{contenido}</Link>
  }
  return <div className={clases}>{contenido}</div>
}

export default function ProductoCabecera({ product, agotado, compacta, avisoStockCompacta = false }: ProductoCabeceraProps) {
  const { t } = useTranslation()
  const cotizable = esProductoCotizable(product)
  const hechoAPedido = product.esPersonalizado === true
  const condicion = product.condicion ? conditionLabel(product.condicion) : ''
  const marcaHref = `/productos?marcaId=${product.marcaId}&marcaNombre=${encodeURIComponent(product.marcaNombre)}`
  const hayEtiquetas = agotado || hechoAPedido || Boolean(product.marcaNombre) || Boolean(condicion)
  const oferta = tieneOfertaActiva(product)
  const stockBajo = !cotizable && !agotado && product.stock <= STOCK_BAJO_MAX

  return (
    <div
      className={`flex flex-col px-4 lg:gap-4 lg:p-0 ${
        compacta ? 'gap-[6px] pb-2 pt-4' : 'gap-[10px] pb-4 pt-[18px]'
      }`}
    >
      {hayEtiquetas && (
        <div className="order-none flex flex-wrap items-center gap-2">
          {agotado && <EtiquetaAgotado t={t} />}
          {hechoAPedido && <span className={`${ETIQUETA} bg-hc-warning-bg text-hc-warning`}>{t('product.hechoAPedido')}</span>}
          {product.marcaNombre && product.marcaId && (
            <Link to={marcaHref} className={`${ETIQUETA} bg-hc-n-100 text-hc-n-600`}>{product.marcaNombre}</Link>
          )}
          {condicion && <span className={`${ETIQUETA} bg-hc-n-100 text-hc-n-600`}>{condicion}</span>}
        </div>
      )}

      <Vendedor product={product} compacta={compacta} />

      <h1
        className={`font-display font-bold tracking-normal text-hc-n-900 [text-wrap:wrap] wrap-anywhere lg:order-2 lg:text-[32px] lg:leading-[38px] ${
          compacta ? 'order-1 text-[20px] leading-[26px]' : 'order-2 text-[22px] leading-7'
        }`}
      >
        {product.titulo || product.nombre}
      </h1>
      {product.titulo && product.titulo !== product.nombre && (
        <p className="order-2 text-[13px] leading-[normal] text-hc-n-600 lg:order-2">{product.nombre}</p>
      )}

      <div className="order-3 flex flex-wrap items-center gap-x-[10px] leading-[normal] lg:items-baseline">
        <p
          className={`font-display text-hc-n-900 lg:text-[34px] lg:font-extrabold lg:leading-[43px] ${
            compacta ? 'text-[24px] font-bold leading-[30px]' : 'text-[26px] font-extrabold leading-[33px]'
          }`}
        >
          {textoPrecioProducto(product)}
        </p>
        {oferta && (
          <s className="text-[13px] text-hc-n-600 lg:text-[15px]">
            <span className="sr-only">{t('product.precioAnterior')} </span>
            {formatPrice(product.precio)}
          </s>
        )}
        {!cotizable && (
          <span className={`${compacta ? 'hidden lg:inline' : ''} text-[12px] text-hc-n-600 lg:text-[13px]`}>
            {t('product.ivaIncluido')}
          </span>
        )}
      </div>

      {!cotizable && !agotado && (
        <p
          className={`order-4 items-center gap-[6px] text-[13px] font-medium leading-[normal] lg:flex lg:text-[14px] ${
            compacta && !(avisoStockCompacta && stockBajo) ? 'hidden' : 'flex'
          } ${stockBajo ? 'text-hc-warning' : 'text-hc-success'}`}
        >
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
          {stockBajo
            ? t('product.quedanN', { count: product.stock })
            : t('product.disponibleStock', { count: product.stock })}
        </p>
      )}

      {product.descripcion && (
        <p className="order-5 text-[14px] leading-[21px] text-hc-n-600 wrap-anywhere lg:text-[15px] lg:leading-[23px]">
          {product.descripcion}
        </p>
      )}
    </div>
  )
}
