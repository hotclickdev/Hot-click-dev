import type { ChangeEvent, FocusEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type SmartFieldProps = {
  label: string
  id: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur?: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  error?: string
  success?: boolean
  placeholder?: string
  type?: string
  maxLength?: number
  multiline?: boolean
  rows?: number
  helpText?: string
}

export default function SmartField({
  label, id, value, onChange, onBlur, error, success, placeholder,
  type = 'text', maxLength, multiline, rows = 3, helpText,
}: SmartFieldProps) {
  const Tag = multiline ? 'textarea' : 'input'
  const labelSuccessColor = success ? '#34d399' : 'var(--hc-muted)'
  const labelColor = error ? '#f87171' : labelSuccessColor
  const autoCompleteForEmail = type === 'email' ? 'email' : 'off'
  const autoCompleteValue = type === 'tel' ? 'tel' : autoCompleteForEmail
  const borderSuccess = success ? '1.5px solid #34d399' : '1.5px solid var(--hc-border)'
  const borderColor = error ? '1.5px solid #f87171' : borderSuccess
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium" style={{ color: labelColor }}>
        {label}
      </label>
      <div className="relative">
        <Tag
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={multiline ? rows : undefined}
          autoComplete={autoCompleteValue}
          className="w-full rounded-xl px-4 py-3 text-sm bg-white/5 outline-none transition-all duration-200 resize-none"
          style={{
            color: 'var(--hc-text)',
            border: borderColor,
          }}
          onFocus={(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = error ? '#f87171' : 'var(--hc-accent)'; e.target.style.boxShadow = error ? '0 0 0 3px rgba(248,113,113,0.1)' : '0 0 0 3px rgba(23,71,168,0.12)' }}
          onBlurCapture={(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.boxShadow = '' }}
        />
        {!multiline && (success || error) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {success && !error && (
              <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </motion.svg>
            )}
            {error && (
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
        )}
      </div>
      <AnimatePresence mode="wait">
        {error && (
          <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="text-xs text-red-400 flex items-center gap-1">
            {error}
          </motion.p>
        )}
        {!error && helpText && (
          <motion.p key="help" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {helpText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
