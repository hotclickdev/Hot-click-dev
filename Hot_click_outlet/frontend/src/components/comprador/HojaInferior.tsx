import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '@/hooks/useFocusTrap'

type HojaInferiorProps = {
  abierta: boolean
  onCerrar: () => void
  titulo: ReactNode
  children: ReactNode
  className?: string
  /** El cupón de bienvenida deja ver la página actual. El resto usa el velo n/900. */
  dejarVerPagina?: boolean
}

/**
 * Hoja inferior del comprador (Figma `45:1612`, `26:888`): velo n/900,
 * esquinas de 22 px y agarradera de 40 × 4. Con `dejarVerPagina` el velo
 * no tapa inicio, productos ni el resto de la pantalla abierta.
 */
export default function HojaInferior({ abierta, onCerrar, titulo, children, className = '', dejarVerPagina = false }: HojaInferiorProps) {
  const { t } = useTranslation()
  const idTitulo = useId()
  const hojaRef = useRef<HTMLDivElement>(null)
  // Teclado: el foco entra en la hoja, Tab no sale de ella y al cerrar vuelve a quien la abrió.
  useFocusTrap(hojaRef, abierta, 'contenedor')

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
      <button
        type="button"
        aria-label={t('comprador.hoja.cerrar')}
        onClick={onCerrar}
        className={`absolute inset-0 ${dejarVerPagina ? 'bg-transparent' : 'bg-hc-n-900'}`}
      />
      <div
        ref={hojaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full max-w-[480px] flex-col gap-[14px] overflow-y-auto rounded-t-[22px] bg-hc-n-0 px-4 pb-7 pt-[10px] outline-none ${className}`}
      >
        <span aria-hidden="true" className="mx-auto h-1 w-10 shrink-0 rounded-[2px] bg-hc-n-200" />
        <div id={idTitulo}>{titulo}</div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
