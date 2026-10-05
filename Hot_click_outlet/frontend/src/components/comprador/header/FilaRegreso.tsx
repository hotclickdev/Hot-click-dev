import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '../IconoFigma'
import { ICONOS_COMPRADOR } from '../iconosComprador'
import { RUTA_CATEGORIAS } from '@/pages/buscar/rutasBuscar'
import { ICONOS_PRODUCTO } from '@/pages/producto/iconosProducto'
import type { DestinoAtras } from './tiposHeader'
import MarcaComprador from './MarcaComprador'
import { useMigasExtra } from './migasContexto'
import { puedeVolverAtras } from './headerHelpers'
import { destinoAlVolver, esRutaPrincipal, migasDeRuta, type EtiquetasMigas, type ExtraMigas, type Miga } from './migasRuta'
import { useHistorialNavegacion } from './useHistorialNavegacion'

type FilaRegresoProps = {
  /**
   * En móvil varias pantallas no tienen encabezado (`propia`). Ahí el logo va en esta fila.
   * En escritorio el encabezado ya lo trae, así que la fila solo lleva flechas y migas.
   */
  conLogoMovil?: boolean
  /** Checkout móvil ya tiene su propia barra de compra segura. */
  ocultarEnMovil?: boolean
  /** Paso interno (login, servicios). Si no hay historial, una ruta de respaldo. */
  atras?: DestinoAtras
  /** La tienda conoce su nombre antes de que la pantalla publique el resto. */
  nombreTienda?: string
  /** `tienda`: el ancho de la barra del negocio. `marketplace`: el del encabezado comprador. */
  alineacion?: 'marketplace' | 'tienda'
}

const CLASE_ENLACE = 'text-hc-n-600 hover:text-hc-blue-600'
const CLASE_FLECHA = 'flex size-10 shrink-0 items-center justify-center rounded-[10px] text-hc-n-900 disabled:text-hc-n-400 lg:size-8'

/**
 * Flechas de historial y migas, debajo del logo. No se dibuja en el inicio ni en las landings principales.
 * Derivado del encabezado de Figma (`7:5`, barra interna `28:1144`) y de las migas de la ficha (`29:2120`).
 */
export default function FilaRegreso({
  conLogoMovil = false,
  ocultarEnMovil = false,
  atras,
  nombreTienda,
  alineacion = 'marketplace',
}: FilaRegresoProps) {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { puedeAdelante } = useHistorialNavegacion()
  const publicado = useMigasExtra()
  if (esRutaPrincipal(pathname)) return null

  const extra: ExtraMigas = { ...publicado, nombreTienda: nombreTienda ?? publicado.nombreTienda }
  const migas = migasDeRuta(pathname, search, etiquetasDe(t), extra)
  const padre = destinoAlVolver(migas)
  const volver = () => {
    if (typeof atras === 'function') { atras(); return }
    // «Todos los productos»: atrás sube a Categorías. El historial suele dejar en el inicio.
    if (padre === RUTA_CATEGORIAS) { navigate(padre); return }
    if (puedeVolverAtras(window.history.state)) { navigate(-1); return }
    if (typeof atras === 'string') { navigate(atras); return }
    navigate(padre)
  }
  const claseFila = alineacion === 'tienda'
    ? 'mx-auto flex min-h-11 w-full max-w-[1232px] items-center gap-1 px-2 lg:min-h-9 lg:px-4'
    : 'flex min-h-11 w-full items-center gap-1 px-2 lg:min-h-9 lg:px-8 xl:px-[max(120px,calc((100%_-_1200px)/2))]'

  return (
    <div className={`border-b border-hc-n-200 bg-hc-n-0 ${ocultarEnMovil ? 'hidden lg:block' : ''}`}>
      {conLogoMovil && (
        <div className="flex items-center px-4 pb-1 pt-2.5 lg:hidden">
          <MarcaComprador tamano="pequena" />
        </div>
      )}
      <div className={claseFila}>
        <button type="button" onClick={volver} aria-label={t('comprador.header.volver')} className={CLASE_FLECHA}>
          <IconoFigma src={ICONOS_COMPRADOR.barraAtras} size={20} />
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          disabled={!puedeAdelante}
          aria-label={t('comprador.header.adelante')}
          className={CLASE_FLECHA}
        >
          <IconoFigma src={ICONOS_COMPRADOR.barraAtras} size={20} className="-scale-x-100" />
        </button>
        <ListaMigas migas={migas} aria={t('product.migasAria')} />
      </div>
    </div>
  )
}

function ListaMigas({ migas, aria }: { migas: Miga[]; aria: string }) {
  return (
    <nav aria-label={aria} className="min-w-0 flex-1 overflow-x-auto text-[13px] leading-[normal] [scrollbar-width:none]">
      <ol className="m-0 flex list-none items-center gap-[6px] whitespace-nowrap p-0">
        {migas.map((miga, i) => (
          <ItemMiga key={`${miga.etiqueta}-${i}`} miga={miga} ultima={i === migas.length - 1} separador={i > 0} />
        ))}
      </ol>
    </nav>
  )
}

function ItemMiga({ miga, ultima, separador }: { miga: Miga; ultima: boolean; separador: boolean }) {
  const actual = ultima && !miga.to
  return (
    <>
      {separador && (
        <li aria-hidden="true" className="flex">
          <IconoFigma src={ICONOS_PRODUCTO.migas} size={12} className="text-[color:var(--hc-n-400)]" />
        </li>
      )}
      <li className={ultima ? 'min-w-0 max-w-[46vw] truncate font-medium text-hc-n-900 lg:max-w-[28rem]' : 'shrink-0'} aria-current={actual ? 'page' : undefined}>
        {miga.to
          ? <Link to={miga.to} className={ultima ? 'hover:text-hc-blue-600' : CLASE_ENLACE}>{miga.etiqueta}</Link>
          : <span className={ultima ? undefined : 'text-hc-n-600'}>{miga.etiqueta}</span>}
      </li>
    </>
  )
}

function etiquetasDe(t: (clave: string) => string): EtiquetasMigas {
  const clave = (nombre: keyof EtiquetasMigas) => t(`comprador.migas.${nombre}`)
  return {
    inicio: clave('inicio'),
    catalogo: clave('catalogo'),
    categoria: clave('categoria'),
    producto: clave('producto'),
    categorias: clave('categorias'),
    descubrir: clave('descubrir'),
    buscarFoto: clave('buscarFoto'),
    carrito: clave('carrito'),
    checkout: clave('checkout'),
    cuenta: clave('cuenta'),
    pedidos: clave('pedidos'),
    pedido: clave('pedido'),
    favoritos: clave('favoritos'),
    opiniones: clave('opiniones'),
    seguridad: clave('seguridad'),
    solicitudes: clave('solicitudes'),
    blog: clave('blog'),
    articulo: clave('articulo'),
    servicios: clave('servicios'),
    buscarProducto: clave('buscarProducto'),
    digitalizar: clave('digitalizar'),
    tiendas: clave('tiendas'),
    tienda: clave('tienda'),
    login: clave('login'),
    registro: clave('registro'),
    ayuda: clave('ayuda'),
    contacto: clave('contacto'),
    nosotros: clave('nosotros'),
    informacion: clave('informacion'),
    privacidad: clave('privacidad'),
    terminos: clave('terminos'),
    devoluciones: clave('devoluciones'),
    envios: clave('envios'),
    cookies: clave('cookies'),
    acuerdo: clave('acuerdo'),
    emprendimientos: clave('emprendimientos'),
    pago: clave('pago'),
    seguimiento: clave('seguimiento'),
    encargo: clave('encargo'),
    cotizacion: clave('cotizacion'),
    recuperar: clave('recuperar'),
    pagoListo: clave('pagoListo'),
  }
}
