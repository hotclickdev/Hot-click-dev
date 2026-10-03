import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { useVariantePieza, type VariantePieza } from '@/components/ui/varianteVisitante'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode
  error?: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  containerClassName?: string
  /** ⚠️ COMPARTIDO. Sin prop: `figma` en rutas del visitante, `clasica` en paneles. */
  variante?: VariantePieza
}

/** Campo del manual de marca (Figma `28:1110`): radio 12, borde n200, foco b600 de 1.5 px con halo b100 de 3 px. */
const INPUT_FIGMA = 'hc-input-libre w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 py-[13px] text-[15px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500 focus:border-hc-blue-600 focus:shadow-[inset_0_0_0_0.5px_var(--hc-blue-600),0_0_0_3px_var(--hc-blue-100)] disabled:cursor-not-allowed disabled:bg-hc-n-50 disabled:text-hc-n-500'

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  id,
  className = '',
  containerClassName = '',
  type = 'text',
  variante,
  ...props
}, ref) => {
  const generatedId = useId()
  const inputId = id || generatedId
  if (useVariantePieza(variante) === 'figma') {
    const idAyuda = `${inputId}-ayuda`
    return (
      <div className={`flex w-full min-w-0 flex-col gap-[6px] leading-[normal] ${containerClassName}`}>
        {label && <label htmlFor={inputId} className="text-[13px] font-semibold text-hc-n-900">{label}</label>}
        <div className="relative">
          {icon && <div className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-hc-n-600">{icon}</div>}
          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? idAyuda : undefined}
            className={`${INPUT_FIGMA} ${icon ? 'pl-10 pr-[14px]' : 'px-[14px]'} ${error ? 'border-hc-red-500 focus:border-hc-red-500' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p id={idAyuda} className="text-[12px] font-medium leading-4 text-hc-red-600">{error}</p>}
        {hint && !error && <p id={idAyuda} className="text-[12px] leading-4 text-hc-n-600">{hint}</p>}
      </div>
    )
  }
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="hc-input-label">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 hc-input-icon pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`
            hc-input
            ${icon ? 'pl-10 pr-4' : 'px-4'}
            ${error ? 'hc-input-error-state' : ''}
            disabled:opacity-40 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="hc-input-error">{error}</p>}
      {hint && !error && <p className="hc-input-hint">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
