import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import { formatPrice } from '@/utils/format'

type GuardarPorCorreoProps = {
  correo: string
  guardado: boolean
  onCambiar: (correo: string) => void
  onGuardar: () => void
}

/** "¿Lo terminás después?": Figma `52:2178`. Reemplaza al popup de correo del carrito. */
export function GuardarPorCorreo({ correo, guardado, onCambiar, onGuardar }: GuardarPorCorreoProps) {
  const { t } = useTranslation()
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    onGuardar()
  }
  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <h2 className="font-sans text-[14px] font-medium leading-[normal] tracking-normal text-hc-n-900">{t('cart.guardarTitulo')}</h2>
      <p className="text-[12px] leading-4 text-hc-n-600">{t('cart.guardarTexto')}</p>
      {guardado ? (
        <p role="status" className="text-[13px] font-semibold leading-[normal] text-hc-success">{t('cart.guardado')}</p>
      ) : (
        <form onSubmit={enviar} className="flex items-center gap-[10px]">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-hc-n-200 bg-hc-n-0 p-3">
            <IconoFigma src={ICONOS_CHECKOUT.guardarCorreo} size={16} className="text-hc-n-500" />
            <input
              type="email"
              value={correo}
              onChange={(e) => onCambiar(e.target.value)}
              placeholder={t('cart.correoPh')}
              aria-label={t('cart.correoPh')}
              className="hc-input-libre min-w-0 flex-1 bg-transparent text-[14px] leading-[normal] text-hc-n-900 outline-none placeholder:text-hc-n-500"
            />
          </label>
          <button type="submit" className="shrink-0 text-[14px] font-semibold leading-[normal] text-hc-blue-600">{t('cart.guardarBoton')}</button>
        </form>
      )}
    </section>
  )
}

/** "¿Dudas con tu pedido?": Figma `52:2223`. Abre el asistente global con la pregunta. */
export function AsistentePedido({ onPreguntar }: { onPreguntar: (texto: string) => void }) {
  const { t } = useTranslation()
  const [valor, setValor] = useState('')
  const frase = t('cart.asistenteFrase')
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    onPreguntar(valor.trim() || frase)
    setValor('')
  }
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-sans text-[14px] font-medium leading-[normal] tracking-normal text-hc-n-900">{t('cart.asistenteTitulo')}</h2>
      <form onSubmit={enviar} className="flex h-12 items-center gap-[10px] rounded-xl border-[1.5px] border-hc-blue-100 bg-hc-n-0 py-[6px] pl-[14px] pr-[6px]">
        <IconoFigma src={ICONOS_COMPRADOR.consultaDestello} size={18} className="text-hc-blue-600" />
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={frase}
          aria-label={t('cart.asistenteTitulo')}
          className="hc-input-libre min-w-0 flex-1 bg-transparent text-[14px] leading-[normal] text-hc-n-900 outline-none placeholder:text-hc-n-500"
        />
        <button type="submit" aria-label={t('cart.asistenteEnviar')} className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-hc-blue-600 text-hc-n-0">
          <IconoFigma src={ICONOS_COMPRADOR.enviarFlecha} size={16} />
        </button>
      </form>
    </section>
  )
}

type PieCarritoMovilProps = {
  total: number
  onContinuar: () => void
  onWhatsApp: () => void
}

/** Pie fijo del carrito móvil: Figma `51:1997` (con WhatsApp) y `28:1080`. */
export function PieCarritoMovil({ total, onContinuar, onWhatsApp }: PieCarritoMovilProps) {
  const { t } = useTranslation()
  return (
    <div className="sticky bottom-0 z-40 flex flex-col gap-[10px] border-t border-hc-n-200 bg-hc-n-0 px-4 pb-6 pt-3">
      <button
        type="button"
        onClick={onWhatsApp}
        className="flex items-center justify-center gap-2 rounded-xl border border-hc-n-200 bg-hc-n-0 px-4 py-[14px] text-[15px] font-semibold leading-[normal] text-hc-n-900"
      >
        <img src={ICONOS_CHECKOUT.whatsapp} alt="" width={18} height={18} />
        {t('cart.whatsapp')}
      </button>
      <button type="button" onClick={onContinuar} className="flex items-center justify-center rounded-xl bg-hc-red-500 px-4 py-[14px] text-[15px] font-semibold leading-[normal] text-hc-n-0">
        {t('cart.continuarPrecio', { precio: formatPrice(total) })}
      </button>
    </div>
  )
}
