import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import CloseIcon from '@/components/ui/CloseIcon'
import { useFocusTrap } from '@/hooks/useFocusTrap'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
} as const

export type ModalProps = {
  open: boolean
  onClose?: () => void
  title?: ReactNode
  children?: ReactNode
  size?: keyof typeof SIZES
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, open)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 backdrop-blur-md"
            style={{ backgroundColor: 'rgba(0, 0, 12, 0.55)' }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${SIZES[size]} hc-modal-bg rounded-2xl max-h-[90vh] overflow-y-auto`}
          >
            {title && (
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid var(--hc-border)' }}
              >
                <h2 id={titleId} className="text-base font-semibold" style={{ color: 'var(--hc-text)' }}>
                  {title}
                </h2>
                <button type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="hc-modal-close rounded-lg p-1.5"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
