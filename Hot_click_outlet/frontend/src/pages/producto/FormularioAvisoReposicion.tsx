import { useState, type FormEvent } from 'react'
import type { TFunction } from 'i18next'
import { productService } from '@/services/productService'
import { mensajeErrorApi } from '@/utils/mensajeErrorApi'
import useAuthStore from '@/store/authStore'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import type { Producto } from '@/types/producto'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FormularioAvisoReposicionProps = {
  product: Producto
  t: TFunction
}

/**
 * "Avisame cuando vuelva" — ficha de producto agotado (Figma 03 · Producto y
 * tiendas, frame 44:1917 "Ficha agotada", nodo 44:1946). Guarda el interés del
 * cliente en el backend. La etiqueta "NUEVO · por programar" del Figma es una nota de
 * diseño (el envío automático al reponer stock aún no existe) y no se muestra al usuario.
 */
export default function FormularioAvisoReposicion({ product, t }: FormularioAvisoReposicionProps) {
  const userEmail = useAuthStore((s) => s.userEmail)
  const [correo, setCorreo] = useState(userEmail || '')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (enviando || enviado || product.id == null) return
    const limpio = correo.trim()
    if (!EMAIL_RE.test(limpio)) {
      setError(t('product.restockInvalidEmail'))
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await productService.avisarReposicion(product.id, limpio)
      setEnviado(true)
    } catch (err: unknown) {
      setError(mensajeErrorApi(err, t('product.restockError')))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-[10px] rounded-[14px] bg-hc-blue-50 p-[14px]">
      <div className="flex w-full items-center gap-2">
        <IconoFigma src={ICONOS_COMPRADOR.avisoCampana} size={18} className="text-hc-blue-600" />
        <h3 className="min-w-0 flex-1 text-[14px] font-semibold text-hc-blue-600">
          {t('product.restockTitle')}
        </h3>
      </div>

      {enviado ? (
        <p className="text-[14px] text-hc-n-900">
          {t('product.restockSaved', { correo })}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex w-full items-center gap-2 rounded-[10px] border border-hc-n-200 bg-hc-n-0 py-[6px] pl-3 pr-[6px] focus-within:border-hc-blue-600"
        >
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder={t('product.restockPlaceholder')}
            aria-label={t('product.restockEmailLabel')}
            aria-invalid={error != null}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-hc-n-900 placeholder:text-hc-n-500 focus:outline-none"
            disabled={enviando}
          />
          <button
            type="submit"
            disabled={enviando}
            className="shrink-0 whitespace-nowrap rounded-[8px] bg-hc-blue-600 px-[14px] py-[9px] text-[13px] font-semibold text-hc-n-0 disabled:opacity-60"
          >
            {enviando ? t('product.restockSending') : t('product.restockCta')}
          </button>
        </form>
      )}
      {error && <p role="alert" className="text-[12px] text-hc-danger">{error}</p>}
      {!enviado && (
        <p className="w-full text-[12px] leading-4 text-hc-n-600">
          {t('product.restockWhatsapp')}
        </p>
      )}
    </div>
  )
}
