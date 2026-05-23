import { motion } from 'framer-motion'
import { forwardRef } from 'react'

const variantClass = {
  primary: 'hc-btn-primary',
  secondary: 'hc-btn-outline',
  ghost: 'hc-btn-ghost',
  danger: 'hc-btn-danger',
  success: 'hc-btn-success',
}

const sizeClass = {
  sm: 'hc-btn-sm',
  md: '',
  lg: 'hc-btn-lg',
  xl: 'hc-btn-xl',
}

const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  loading,
  children,
  icon,
  ...props
}, ref) => {
  return (
    <motion.button
      ref={ref}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      transition={{ duration: 0.12 }}
      disabled={disabled || loading}
      className={`
        hc-btn
        ${variantClass[variant]}
        ${sizeClass[size]}
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  )
})

Button.displayName = 'Button'
export default Button
