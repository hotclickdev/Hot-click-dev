import atras from '@/assets/figma/producto/atras.svg'
import atras19 from '@/assets/figma/producto/atras-19.svg'
import bolsa from '@/assets/figma/producto/bolsa.svg'
import cerrar from '@/assets/figma/producto/cerrar.svg'
import compartir from '@/assets/figma/producto/compartir.svg'
import compartir19 from '@/assets/figma/producto/compartir-19.svg'
import compartirClaro from '@/assets/figma/producto/compartir-claro.svg'
import elaboracion from '@/assets/figma/producto/elaboracion.svg'
import envio from '@/assets/figma/producto/envio.svg'
import agregarBarra from '@/assets/figma/producto/agregar-barra.svg'
import favorito from '@/assets/figma/producto/favorito.svg'
import favorito19 from '@/assets/figma/producto/favorito-19.svg'
import favoritoEscritorio from '@/assets/figma/producto/favorito-escritorio.svg'
import gestoZoom from '@/assets/figma/producto/gesto-zoom.svg'
import migas from '@/assets/figma/producto/migas.svg'
import opiniones from '@/assets/figma/producto/opiniones.svg'
import pagoSeguro from '@/assets/figma/producto/pago-seguro.svg'
import subirImagen from '@/assets/figma/producto/subir-imagen.svg'
import tienda from '@/assets/figma/producto/tienda.svg'

/**
 * Íconos de la ficha de producto, exportados tal cual del Figma (`28:839`, `29:2072`, `44:1775`,
 * `44:1849`, `55:2167`). Los `*19` miden 19,2 px como en la galería de `28:839`; el resto, 18 px.
 */
export const ICONOS_PRODUCTO = {
  agregarBarra,
  atras,
  atras19,
  bolsa,
  cerrar,
  compartir,
  compartir19,
  compartirClaro,
  elaboracion,
  envio,
  favorito,
  favorito19,
  favoritoEscritorio,
  gestoZoom,
  migas,
  opiniones,
  pagoSeguro,
  subirImagen,
  tienda,
} as const
