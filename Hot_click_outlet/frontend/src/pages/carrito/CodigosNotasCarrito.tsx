import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import { LineaCodigo, TituloValido } from '@/pages/checkout/CodigoDescuento'
import { formatoRebaja, saldoRestanteGiftCard } from '@/pages/checkout/codigoDescuentoHelpers'
import { formatPrice } from '@/utils/format'
import type { CodigosPedido } from '@/pages/checkout/useCodigosPedido'

const MAX_NOTAS = 300

/** "Notas para el pedido (opcional)": Figma `52:2139`. */
export function NotasPedido({ notas, onCambiar }: { notas: string; onCambiar: (valor: string) => void }) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <label htmlFor="notas-pedido" className="text-[14px] font-medium leading-[normal] text-hc-n-900">{t('cart.notasTitulo')}</label>
      <textarea
        id="notas-pedido"
        value={notas}
        maxLength={MAX_NOTAS}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={t('cart.notasPh')}
        className="hc-input-libre h-[72px] w-full resize-none rounded-[12px] border border-hc-n-200 bg-hc-n-0 p-3 text-[14px] leading-[normal] text-hc-n-900 outline-none placeholder:text-hc-n-500"
      />
      <p className="text-[11px] leading-[15px] text-hc-n-500">{t('cart.notasAyuda')}</p>
    </section>
  )
}

type FilaCodigoProps = {
  icono: string
  /** El glifo del cupón y el del regalo vienen de assets distintos; ambos se pintan con máscara. */
  placeholder: string
  ariaLabel: string
  valor: string
  estado: string
  deshabilitado?: boolean
  maxLength: number
  onCambiar: (valor: string) => void
  onAplicar: () => void
  onQuitar: () => void
  invalido: ReactNode
  valido: ReactNode
}

/** Campo de código con "Aplicar": Figma `51:1965` (cupón) y `52:2165` (gift card). */
function FilaCodigo({ icono, placeholder, ariaLabel, valor, estado, deshabilitado, maxLength, onCambiar, onAplicar, onQuitar, invalido, valido }: FilaCodigoProps) {
  const { t } = useTranslation()
  const aplicado = estado === 'valid'
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-[10px]">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 p-3">
          <IconoFigma src={icono} size={16} className="text-hc-n-500" />
          <input
            value={valor}
            onChange={(e) => onCambiar(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAplicar() } }}
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-invalid={estado === 'invalid'}
            disabled={deshabilitado}
            maxLength={maxLength}
            className="hc-input-libre min-w-0 flex-1 bg-transparent text-[14px] leading-[normal] text-hc-n-900 outline-none placeholder:text-hc-n-500 disabled:cursor-not-allowed"
          />
        </label>
        {aplicado ? (
          <button type="button" onClick={onQuitar} className="shrink-0 text-[14px] font-semibold leading-[normal] text-hc-n-600">{t('checkout.codigo.quitar')}</button>
        ) : (
          <button
            type="button"
            onClick={onAplicar}
            disabled={deshabilitado || estado === 'loading' || !valor.trim()}
            className={`shrink-0 text-[14px] font-semibold leading-[normal] text-hc-blue-600 disabled:cursor-not-allowed ${deshabilitado ? 'opacity-40' : ''}`}
          >
            {estado === 'loading' ? t('checkout.codigo.validando') : t('checkout.codigo.aplicar')}
          </button>
        )}
      </div>
      {estado === 'invalid' && (
        <div role="alert" className="flex items-start gap-2 rounded-[10px] bg-[var(--hc-danger-bg)] p-3">
          <IconoFigma src={ICONOS_COMPRADOR.codigoError} size={16} className="text-hc-danger" />
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">{invalido}</div>
        </div>
      )}
      {aplicado && <div className="flex flex-col gap-[6px] rounded-[10px] bg-hc-success-bg p-3">{valido}</div>}
    </div>
  )
}

type CodigosCarritoProps = {
  codigos: CodigosPedido
  /** La gift card solo se aplica con sesión iniciada. */
  conSesion: boolean
  /** Muestra el campo de gift card (móvil `51:1820`). */
  incluirGiftCard: boolean
  /** Aplicado para ajustar el tope del descuento que ve el cliente. */
  descuentoMonto: number
  giftCardAplicada: number
}

/** Cupón y gift card del carrito. */
export function CodigosCarrito({ codigos, conSesion, incluirGiftCard, descuentoMonto, giftCardAplicada }: CodigosCarritoProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-[10px]">
      <FilaCodigo
        icono={ICONOS_CHECKOUT.cupon}
        placeholder={t('cart.cuponPh')}
        ariaLabel={t('checkout.codigo.cuponAria')}
        valor={codigos.cuponInput}
        estado={codigos.cuponEstado}
        maxLength={20}
        onCambiar={codigos.cambiarCupon}
        onAplicar={codigos.validarCupon}
        onQuitar={codigos.quitarCupon}
        invalido={<p className="text-[13px] font-semibold text-hc-red-500">{codigos.cuponError || t('checkout.codigo.cuponInvalidoTitulo')}</p>}
        valido={(
          <>
            <TituloValido texto={t('checkout.codigo.cuponValidoTitulo')} />
            <LineaCodigo etiqueta={t('checkout.codigo.cuponDescuento', { porcentaje: codigos.cuponDescuento })} valor={formatoRebaja(descuentoMonto)} rebaja />
          </>
        )}
      />
      {incluirGiftCard && (
        <>
          <FilaCodigo
            icono={ICONOS_COMPRADOR.codigoRegalo}
            placeholder={t('cart.giftCardPh')}
            ariaLabel={t('checkout.codigo.giftAria')}
            valor={codigos.gcInput}
            estado={codigos.gcEstado}
            deshabilitado={!conSesion}
            maxLength={30}
            onCambiar={codigos.cambiarGiftCard}
            onAplicar={codigos.validarGiftCard}
            onQuitar={codigos.quitarGiftCard}
            invalido={(
              <>
                <p className="text-[13px] font-semibold text-hc-red-500">{t('checkout.codigo.giftInvalidoTitulo')}</p>
                <p className="text-[12px] leading-4 text-[var(--hc-text-secondary)]">{t('checkout.codigo.giftInvalidoAyuda')}</p>
              </>
            )}
            valido={(
              <>
                <TituloValido texto={t('checkout.codigo.giftValidoTitulo')} />
                <LineaCodigo etiqueta={t('checkout.codigo.saldoDisponible')} valor={formatPrice(codigos.gcSaldo)} />
                <LineaCodigo etiqueta={t('checkout.codigo.seAplica')} valor={formatoRebaja(giftCardAplicada)} rebaja />
                <LineaCodigo etiqueta={t('checkout.codigo.saldoRestante')} valor={formatPrice(saldoRestanteGiftCard(codigos.gcSaldo, giftCardAplicada))} />
              </>
            )}
          />
          <p className="text-[11px] leading-[15px] text-hc-n-500">{t('cart.giftCardAyuda')}</p>
        </>
      )}
    </div>
  )
}
