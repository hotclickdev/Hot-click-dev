import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

type HojaInferiorProps = {
  abierta: boolean
  onCerrar: () => void
  titulo: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Hoja inferior del comprador (Figma `45:1612`, `26:888`): velo n/900,
 * esquinas de 22 px y agarradera de 40 × 4.
 */
export default function HojaInferior({ abierta, onCerrar, titulo, children, className = '' }: HojaInferiorProps) {
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
        className={`relative flex max-h-[92vh] w-full max-w-[480px] flex-col gap-[14px] overflow-y-auto rounded-t-[22px] bg-hc-n-0 px-4 pb-7 pt-[10px] ${className}`}
      >
        <span aria-hidden="true" className="mx-auto h-1 w-10 shrink-0 rounded-[2px] bg-hc-n-200" />
        <div id={idTitulo}>{titulo}</div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
