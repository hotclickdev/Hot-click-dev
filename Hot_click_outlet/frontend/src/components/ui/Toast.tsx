import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TrustGlyph from './TrustGlyph'
import CloseIcon from './CloseIcon'
import useAuthStore from '@/store/authStore'
import { varianteDeRuta, type VariantePieza } from './varianteVisitante'

type ToastType = 'success' | 'error' | 'warning' | 'info'

/** Duración por defecto de un toast que se cierra solo. */
export const DURACION_TOAST_MS = 5000

type ToastAccion = { label: string; onClick: () => void }

type ToastItem = {
  id: number
  message: string
  type: ToastType
  accion?: ToastAccion
  variante: VariantePieza
}

type ShowToastFn = (opts: { message: string; type?: ToastType; duration?: number; accion?: ToastAccion }) => void

/** null = queda hasta la X. Si no, milisegundos hasta ocultarlo. Los errores solo se van si el llamador pasa `duration`. */
export function msCierreToast(type: ToastType, duration: number | undefined, tieneAccion: boolean): number | null {
  if (tieneAccion) return null
  if (type === 'error' && duration == null) return null
  return duration ?? DURACION_TOAST_MS
}

function tipoGlifoToast(type: ToastType) {
  if (type === 'success') return 'check'
  if (type === 'error') return 'error'
  if (type === 'warning') return 'alerta'
  return 'info'
}

const ToastContext = createContext<ShowToastFn | null>(null)

let toastId = 0

/**
 * Toasts según Brand Book cap. 7.5: esquina inferior izquierda, fondo neutro 900,
 * radio 12, 5 s (los errores persisten hasta que el usuario los descarte,
 * salvo que el llamador pase `duration`),
 * máximo 3 apilados, icono con color semántico + texto (el color nunca es el
 * único indicador, cap. 9). En móvil se elevan sobre el BottomNav.
 */
/**
 * `variantePorRuta` (solo `App`): cada toast toma la variante de la ruta en que se crea (visitante = Figma).
 * Sin la prop (tests, paneles sueltos) todos los toasts son clásicos. ⚠️ COMPARTIDO.
 */
export function ToastProvider({ children, variantePorRuta = false }: { children: ReactNode; variantePorRuta?: boolean }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback<ShowToastFn>(({ message, type = 'info', duration, accion }) => {
    const id = ++toastId
    // ⚠️ COMPARTIDO: la variante se fija al crear el toast, según la ruta (visitante = Figma, paneles = clásica).
    const variante: VariantePieza = variantePorRuta
      ? varianteDeRuta(globalThis.location?.pathname ?? '/', useAuthStore.getState().userRole)
      : 'clasica'
    setToasts((prev) => [...prev, { id, message, type, accion, variante }].slice(-3))
    const ms = msCierreToast(type, duration, Boolean(accion))
    if (ms != null) {
      const filterOut = (prev: ToastItem[]) => prev.filter((t) => t.id !== id)
      setTimeout(() => setToasts(filterOut), ms)
    }
  }, [variantePorRuta])

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const ICON_BG: Record<ToastType, string> = {
    success: 'var(--hc-success)',
    error: 'var(--hc-red-500)',
    warning: 'var(--hc-warning)',
    info: 'var(--hc-blue-500)',
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed left-4 z-[9999] flex flex-col gap-2 pointer-events-none
                   bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-4"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.filter((t) => t.variante !== 'figma').map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              role={t.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex items-start gap-3 px-4 py-3 max-w-[min(24rem,calc(100vw-2rem))]"
              style={{
                background: 'var(--hc-n-900)',
                color: '#FFFFFF',
                borderRadius: 12,
                boxShadow: 'var(--hc-shadow-3)',
              }}
            >
              <span
                className="flex items-center justify-center shrink-0 rounded-full text-[11px] font-extrabold"
                style={{ width: 20, height: 20, marginTop: 1, background: ICON_BG[t.type] || ICON_BG.info, color: '#FFFFFF' }}
                aria-hidden="true"
              >
                <TrustGlyph tipo={tipoGlifoToast(t.type)} className="w-3 h-3" />
              </span>
              <p className="text-sm leading-snug flex-1 min-w-0 wrap-anywhere">{t.message}</p>
              {t.accion && (
                <button type="button"
                  onClick={() => { t.accion?.onClick(); remove(t.id) }}
                  className="shrink-0 text-sm font-semibold underline hover:no-underline"
                  style={{ marginTop: 1 }}
                >
                  {t.accion.label}
                </button>
              )}
              <button type="button"
                onClick={() => remove(t.id)}
                aria-label="Cerrar notificación"
                className="shrink-0 flex items-center justify-center rounded opacity-60 hover:opacity-100 transition-opacity"
                style={{ width: 18, height: 18, marginTop: 1 }}
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <PilaToastsFigma toasts={toasts.filter((t) => t.variante === 'figma')} onCerrar={remove} />
    </ToastContext.Provider>
  )
}

const ICONO_FIGMA: Record<ToastType, string> = {
  success: 'bg-hc-success-bg text-hc-success-text',
  error: 'bg-hc-red-50 text-hc-red-600',
  warning: 'bg-hc-warning-bg text-hc-warning',
  info: 'bg-hc-blue-50 text-hc-blue-600',
}

/**
 * Toasts del visitante (derivado de Figma `29:2036` y del aviso de versión nueva): tarjeta blanca de radio 14
 * con borde n200, centrada abajo, ícono en círculo de color semántico claro, texto SemiBold 14 n900 y acción azul b600.
 */
function PilaToastsFigma({ toasts, onCerrar }: { toasts: ToastItem[]; onCerrar: (id: number) => void }) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[9999] flex w-[min(92vw,24rem)] -translate-x-1/2 flex-col gap-2 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] md:bottom-6"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role={t.type === 'error' ? 'alert' : 'status'}
            data-variante="figma"
            className="pointer-events-auto flex items-center gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-3 leading-[normal] shadow-[0_8px_24px_rgba(20,23,28,0.12)]"
          >
            <span aria-hidden="true" className={`flex size-7 shrink-0 items-center justify-center rounded-full ${ICONO_FIGMA[t.type] || ICONO_FIGMA.info}`}>
              <TrustGlyph tipo={tipoGlifoToast(t.type)} className="size-4" />
            </span>
            <p className="min-w-0 flex-1 text-[14px] font-semibold leading-[18px] text-hc-n-900 wrap-anywhere">{t.message}</p>
            {t.accion && (
              <button
                type="button"
                onClick={() => { t.accion?.onClick(); onCerrar(t.id) }}
                className="shrink-0 text-[14px] font-semibold text-hc-blue-600"
              >
                {t.accion.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => onCerrar(t.id)}
              aria-label="Cerrar notificación"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-hc-n-600 hover:bg-hc-n-100 hover:text-hc-n-900"
            >
              <CloseIcon className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  const showToast = (message: string, type: ToastType = 'info') => ctx({ message, type })
  return Object.assign(ctx, { showToast })
}
