import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode
  error?: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  containerClassName?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  id,
  className = '',
  containerClassName = '',
  type = 'text',
  ...props
}, ref) => {
  const generatedId = useId()
  const inputId = id || generatedId
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
