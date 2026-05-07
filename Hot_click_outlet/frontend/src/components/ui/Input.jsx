import { forwardRef } from 'react'

const Input = forwardRef(({
  label,
  error,
  hint,
  icon,
  className = '',
  containerClassName = '',
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-medium text-[#e8e8ed]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e9a] pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            w-full h-11 rounded-xl
            bg-white/5 border border-white/10
            text-[#e8e8ed] placeholder:text-[#8e8e9a]/60
            text-sm
            transition-all duration-200
            focus:outline-none focus:border-[#4f7cff]/60 focus:bg-white/7 focus:ring-2 focus:ring-[#4f7cff]/10
            disabled:opacity-40 disabled:cursor-not-allowed
            ${icon ? 'pl-10 pr-4' : 'px-4'}
            ${error ? 'border-red-500/50 focus:border-red-500/70' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-[#8e8e9a]">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
