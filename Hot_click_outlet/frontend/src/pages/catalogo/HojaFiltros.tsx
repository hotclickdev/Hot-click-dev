import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

/**
 * Hoja de filtros móvil (Figma `26:888`): velo n/900, esquinas de 22 px, sin agarradera, encabezado
 * "Filtros / Limpiar todo", secciones a todo el ancho y pie con el botón rojo "Ver N productos".
 * Es propia de CAT porque `HojaInferior` (CHK) lleva agarradera y relleno lateral.
 */
export default function HojaFiltros({
  abierta, onCerrar, onLimpiar, cantidad, children,
}: {
  abierta: boolean
  onCerrar: () => void
  onLimpiar: () => void
  cantidad: number
  children: ReactNode
}) {
  const { t } = useTranslation()
  const idTitulo = useId()

  useEffect(() => {
    if (!abierta) return undefined
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    globalThis.addEventListener('keydown', alTeclear)
    return () => {
      document.body.style.overflow = overflowPrevio
      globalThis.removeEventListener('keydown', alTeclear)
    }
  }, [abierta, onCerrar])

  if (!abierta) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button type="button" aria-label={t('comprador.hoja.cerrar')} onClick={onCerrar} className="absolute inset-0 bg-hc-n-900" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="relative flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[22px] bg-hc-n-0"
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-[18px] leading-[normal]">
          <h2 id={idTitulo} className="font-display text-[18px] font-bold text-hc-n-900">{t('products.filters')}</h2>
          <button type="button" onClick={onLimpiar} className="text-[13px] font-semibold text-hc-blue-600">{t('products.clearAll')}</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        <div className="border-t border-hc-n-200 px-4 pb-6 pt-3">
          <button
            type="button"
            onClick={onCerrar}
            className="w-full rounded-[12px] bg-hc-red-500 py-[14px] text-[15px] font-semibold leading-[normal] text-hc-n-0"
          >
            {t('products.viewProducts', { count: cantidad })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
