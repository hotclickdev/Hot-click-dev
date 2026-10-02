import type { RefObject } from 'react'
import type { TFunction } from 'i18next'
import Chip from '@/components/comprador/Chip'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import useChatStore from '@/store/chatStore'
import type { Producto } from '@/types/producto'
import FormularioAvisoReposicion from './FormularioAvisoReposicion'

/*
 * Piezas de la ficha agotada · móvil (Figma 03 · Producto y tiendas, 44:1917).
 * "Parecidos disponibles" usa CarruselProductos.
 */

/** Etiqueta "Agotado" sobre el título (Figma 44:1936). */
export function EtiquetaAgotado({ t }: { t: TFunction }) {
  return (
    <span className="inline-flex w-fit items-start rounded-full bg-hc-n-100 px-2 py-[3px] text-[11px] font-semibold leading-[13px] text-hc-n-600">
      {t('product.outOfStock')}
    </span>
  )
}

/** Bloque "Avisame": formulario de aviso de reposición + chip "Buscame algo parecido" (Figma 44:1945). */
export function AvisameAgotado({ product, t }: { product: Producto; t: TFunction }) {
  const abrirChat = useChatStore((s) => s.open)
  const nombre = product.titulo || product.nombre

  return (
    <div className="flex flex-col gap-[10px] px-4 py-2 lg:p-0">
      <FormularioAvisoReposicion product={product} t={t} />
      <div className="flex w-full items-center">
        <Chip
          texto={t('product.buscarParecido')}
          variante="asistente"
          onClick={() => abrirChat(t('product.buscarParecidoMensaje', { nombre }))}
        />
      </div>
    </div>
  )
}

/** Barra de compra bloqueada: "+ Agotado" deshabilitado (Figma 44:2016). */
export function BotonAgotado({
  mainCTARef, t,
}: {
  mainCTARef?: RefObject<HTMLButtonElement | null>
  t: TFunction
}) {
  return (
    <button
      ref={mainCTARef}
      type="button"
      disabled
      aria-disabled="true"
      className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[12px] bg-hc-n-200 py-[14px] text-[15px] font-semibold leading-[normal] text-hc-n-500"
    >
      <IconoFigma src={ICONOS_COMPRADOR.agotadoMas} size={18} />
      {t('product.outOfStock')}
    </button>
  )
}
