import type { RefObject } from 'react'
import type { TFunction } from 'i18next'
import Chip from '@/components/comprador/Chip'
import IconoFigma from '@/components/comprador/IconoFigma'
import ProductCard from '@/components/comprador/ProductCard'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import useChatStore from '@/store/chatStore'
import type { Producto } from '@/types/producto'

/*
 * Piezas de la ficha agotada · móvil (Figma 03 · Producto y tiendas, 44:1917).
 * El formulario "Te avisamos cuando vuelva" vive en FormularioAvisoReposicion.
 */

/** Etiqueta "Agotado" sobre el título (Figma 44:1936). */
export function EtiquetaAgotado({ t }: { t: TFunction }) {
  return (
    <span className="inline-flex w-fit items-start rounded-full bg-hc-n-100 px-2 py-[3px] text-[11px] font-semibold text-hc-n-600">
      {t('product.outOfStock')}
    </span>
  )
}

/** Chip "Buscame algo parecido" + carrusel "Parecidos disponibles" (Figma 44:1959 y 44:1965). */
export function AlternativasAgotado({
  product, parecidos, t,
}: {
  product: Producto
  parecidos: Producto[]
  t: TFunction
}) {
  const abrirChat = useChatStore((s) => s.open)
  const nombre = product.titulo || product.nombre

  return (
    <>
      <div className="flex w-full items-center">
        <Chip
          texto={t('product.buscarParecido')}
          variante="asistente"
          onClick={() => abrirChat(t('product.buscarParecidoMensaje', { nombre }))}
        />
      </div>

      {parecidos.length > 0 && (
        <section className="flex w-full flex-col gap-3 pt-1" aria-labelledby="parecidos-disponibles">
          <h2 id="parecidos-disponibles" className="font-display text-[16px] font-bold text-hc-n-900">
            {t('product.parecidosDisponibles')}
          </h2>
          <div className="scrollbar-hide flex w-full gap-3 overflow-x-auto">
            {parecidos.map((p) => (
              <ProductCard key={p.id} product={p} className="w-[167px] shrink-0" />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

/** Barra de compra bloqueada: "+ Agotado" deshabilitado (Figma 44:2016). */
export function BotonAgotado({
  mainCTARef, t,
}: {
  mainCTARef: RefObject<HTMLButtonElement | null>
  t: TFunction
}) {
  return (
    <button
      ref={mainCTARef}
      type="button"
      disabled
      aria-disabled="true"
      className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[12px] bg-hc-n-200 py-[14px] text-[15px] font-semibold text-hc-n-500"
    >
      <IconoFigma src={ICONOS_COMPRADOR.agotadoMas} size={18} />
      {t('product.outOfStock')}
    </button>
  )
}
