import { useState, type CSSProperties, type FormEvent } from 'react'
import type { TFunction } from 'i18next'
import { productService } from '@/services/productService'
import { mensajeErrorApi } from '@/utils/mensajeErrorApi'
import useAuthStore from '@/store/authStore'
import { BellSVG } from './productIcons'
import type { Producto } from '@/types/producto'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type NotifyRestockFormProps = {
  product: Producto
  t: TFunction
}

/**
 * "Avisame cuando vuelva" — ficha de producto agotado (Figma 03 · Producto y
 * tiendas, frame 44:1917 "Ficha agotada"). Guarda el interés del cliente en
 * el backend; el envío automático del correo al reponer stock es
 * NUEVO · por programar (todavía no hay disparador de reposición).
 */
export default function NotifyRestockForm({ product, t }: NotifyRestockFormProps) {
  const userEmail = useAuthStore((s) => s.userEmail)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const [correo, setCorreo] = useState(userEmail || '')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (enviando || enviado || product.id == null) return
    const limpio = correo.trim()
    if (!EMAIL_RE.test(limpio)) {
      setError(t('product.restockInvalidEmail', 'Ingresá un correo válido'))
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await productService.avisarReposicion(product.id, limpio)
      setEnviado(true)
    } catch (err: unknown) {
      setError(mensajeErrorApi(err, t('product.restockError', 'No se pudo guardar tu aviso')))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-hc-border bg-hc-surface p-4">
      <div className="flex items-start gap-2.5 mb-3">
        <span className="mt-0.5 shrink-0 text-hc-muted"><BellSVG /></span>
        <h3 className="text-sm font-bold text-hc-text leading-snug flex-1">
          {t('product.restockTitle', 'Te avisamos cuando vuelva')}
        </h3>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
          style={{ background: 'var(--hc-surface-3)', color: 'var(--hc-muted)' }}
        >
          {t('common.newComingSoon', 'NUEVO · por programar')}
        </span>
      </div>

      {enviado ? (
        <p className="text-sm text-hc-text">
          {t('product.restockSaved', 'Listo, te avisamos a {{correo}} en cuanto vuelva.', { correo })}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@correo.com"
            aria-label={t('product.restockEmailLabel', 'Tu correo para avisarte')}
            className="flex-1 min-w-0 h-11 rounded-xl border border-hc-border bg-hc-bg px-3.5 text-sm text-hc-text placeholder:text-hc-muted focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--hc-accent)' } as CSSProperties}
            disabled={enviando}
          />
          <button
            type="submit"
            disabled={enviando}
            className="h-11 shrink-0 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--hc-accent)' }}
          >
            {enviando ? t('common.sending', 'Enviando…') : t('product.restockCta', 'Avisame')}
          </button>
        </form>
      )}
      {error && <p className="text-xs mt-2" style={{ color: 'var(--hc-danger, #dc2626)' }}>{error}</p>}
      {!enviado && (
        <p className="text-xs text-hc-muted mt-3">
          {isAuthenticated
            ? t('product.restockWhatsapp', 'Si ingresaste a tu cuenta, también te avisamos por WhatsApp.')
            : t('product.restockNoAccount', 'También podés crear tu cuenta para que te avisemos por WhatsApp.')}
        </p>
      )}
    </div>
  )
}
