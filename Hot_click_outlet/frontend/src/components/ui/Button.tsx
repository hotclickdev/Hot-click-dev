import { motion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'
import { useVariantePieza, type VariantePieza } from '@/components/ui/varianteVisitante'

/**
 * Botón canónico de HotClick (Brand Book v1.1 / audit visual-ux P1-01).
 * Toda superficie nueva debería usar este componente o las clases CSS
 * `.hc-btn-*` que consume, en vez de crear otro sistema de botón
 * (`Boton` del prototipo seller, `cfg-btn-*` de config, `AdminPrimaryButton`…
 * ver anexo-1-sistema-visual.md §3 para el inventario y el plan de migración).
 */

const variantClass = {
  primary: 'hc-btn-primary',
  secondary: 'hc-btn-outline',
  ghost: 'hc-btn-ghost',
  danger: 'hc-btn-danger',
  success: 'hc-btn-success',
} as const

const sizeClass = {
  sm: 'hc-btn-sm',
  md: '',
  lg: 'hc-btn-lg',
  xl: 'hc-btn-xl',
} as const

/** Visitante (manual de marca): primario rojo de 48, secundario con borde n200, radio 12, SemiBold 15. */
const variantFigma = {
  primary: 'bg-hc-red-500 text-hc-n-0 hover:bg-hc-red-600',
  secondary: 'border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50',
  ghost: 'bg-transparent text-hc-blue-600 hover:bg-hc-blue-50',
  danger: 'border border-hc-danger bg-hc-n-0 text-hc-danger hover:bg-hc-red-50',
  success: 'bg-hc-success text-hc-n-0',
} as const

const sizeFigma = {
  sm: 'min-h-10 px-[14px] text-[13px]',
  md: 'min-h-12 px-4 text-[15px]',
  lg: 'min-h-12 px-5 text-[15px]',
  xl: 'min-h-[52px] px-6 text-[16px]',
} as const

export type ButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: keyof typeof variantClass
  size?: keyof typeof sizeClass
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
  /** ⚠️ COMPARTIDO. Sin prop: `figma` en rutas del visitante, `clasica` en paneles. */
  variante?: VariantePieza
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  loading,
  children,
  icon,
  variante,
  ...props
}, ref) => {
  const figma = useVariantePieza(variante) === 'figma'
  const clases = figma
    ? `inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold leading-[normal] transition-colors ${variantFigma[variant]} ${sizeFigma[size]} disabled:opacity-60 disabled:cursor-not-allowed ${className}`
    : `
        hc-btn
        ${variantClass[variant]}
        ${sizeClass[size]}
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `
  return (
    <motion.button
      ref={ref}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      transition={{ duration: 0.12 }}
      type="button"
      disabled={disabled || loading}
      className={clases}
      {...props}
    >
      {loading && figma && (
        <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current" />
      )}
      {loading && !figma && (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && icon && (
        <span className="shrink-0">{icon}</span>
      )}
      {children}
    </motion.button>
  )
})

Button.displayName = 'Button'
export default Button
