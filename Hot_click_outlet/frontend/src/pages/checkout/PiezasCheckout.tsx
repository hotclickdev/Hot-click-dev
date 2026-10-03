import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import MarcaComprador from '@/components/comprador/header/MarcaComprador'
import { formatPrice } from '@/utils/format'
import { ICONOS_CHECKOUT } from './iconosCheckout'

type CabeceraProps = { onAtras: () => void }

/** "Header compra segura" móvil: flecha, logo y sello (Figma `28:1084`). */
export function CabeceraCompraSegura({ onAtras }: CabeceraProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between border-b border-hc-n-200 bg-hc-n-0 px-4 py-[14px] leading-[normal]">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onAtras} aria-label={t('comprador.header.volver')} className="flex shrink-0 text-hc-n-900">
          <IconoFigma src={ICONOS_COMPRADOR.barraAtras} size={22} />
        </button>
        <MarcaComprador tamano="centrada" />
      </div>
      <p className="flex items-center gap-[5px] text-[12px] font-semibold text-hc-success-text">
        <IconoFigma src={ICONOS_CHECKOUT.candadoCompraSegura} size={15} />
        {t('checkout.f.compraSegura')}
      </p>
    </div>
  )
}

type IndicadorPasosProps = { paso: number; onIr: (paso: number) => void }

/** Indicador "1 · Datos / 2 · Entrega / 3 · Pago" (Figma `28:1096`). */
export function IndicadorPasos({ paso, onIr }: IndicadorPasosProps) {
  const { t } = useTranslation()
  const pasos = [t('checkout.f.paso1'), t('checkout.f.paso2'), t('checkout.f.paso3')]
  return (
    <nav aria-label={t('checkoutStepper.progress')} className="bg-hc-n-0 px-4 pb-[14px] pt-3">
      <ol className="flex items-center gap-[6px]">
        {pasos.map((etiqueta, i) => {
          const numero = i + 1
          const actual = numero === paso
          const hecho = numero < paso
          const color = actual ? 'font-semibold text-hc-n-900' : hecho ? 'font-medium text-hc-blue-600' : 'font-medium text-hc-n-600'
          return (
            <li key={etiqueta} className="flex min-w-px flex-1 flex-col gap-[6px]">
              <span className={`h-1 w-full rounded-[2px] ${numero <= paso ? 'bg-hc-blue-600' : 'bg-hc-n-200'}`} />
              {hecho ? (
                <button type="button" onClick={() => onIr(numero)} className={`text-left text-[12px] leading-[normal] ${color}`}>{etiqueta}</button>
              ) : (
                <span aria-current={actual ? 'step' : undefined} className={`text-[12px] leading-[normal] ${color}`}>{etiqueta}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

type PieCheckoutProps = {
  total: number
  etiqueta: string
  onClick: () => void
  deshabilitado?: boolean
  /** "Total restante a pagar" cuando una tarjeta de regalo cubre parte del pedido (Figma `55:2220`). */
  restante?: boolean
}

/** Pie fijo con Total y el botón rojo del paso (Figma `28:1136`). */
export function PieCheckoutMovil({ total, etiqueta, onClick, deshabilitado, restante }: PieCheckoutProps) {
  const { t } = useTranslation()
  return (
    <div className="sticky bottom-0 z-40 flex flex-col gap-[10px] border-t border-hc-n-200 bg-hc-n-0 px-4 pb-6 pt-3 leading-[normal]">
      <div className="flex items-center justify-between text-hc-n-900">
        <p className="text-[15px] font-semibold leading-[18px]">{t(restante ? 'checkout.codigo.totalRestante' : 'checkout.total')}</p>
        <p className="font-display text-[17px] font-bold leading-[21px]">{formatPrice(total)}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={deshabilitado}
        className="flex items-center justify-center rounded-[12px] bg-hc-red-500 px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-hc-n-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {etiqueta}
      </button>
    </div>
  )
}

type CampoProps = {
  etiqueta: string
  ayuda?: string
  error?: string
  children: (ids: { id: string; describedBy?: string }) => ReactNode
}

/** Etiqueta + control + ayuda o error (Figma `28:1110`). */
export function Campo({ etiqueta, ayuda, error, children }: CampoProps) {
  const id = useId()
  const idMensaje = `${id}-msg`
  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-[6px] leading-[normal]">
      <label htmlFor={id} className="text-[13px] font-semibold text-hc-n-900">{etiqueta}</label>
      {children({ id, describedBy: error || ayuda ? idMensaje : undefined })}
      {error ? (
        <p id={idMensaje} role="alert" className="text-[12px] leading-4 text-hc-danger">{error}</p>
      ) : ayuda ? (
        <p id={idMensaje} className="text-[12px] leading-4 text-hc-n-600">{ayuda}</p>
      ) : null}
    </div>
  )
}

function claseCaja(escritorio: boolean, error: boolean): string {
  const forma = escritorio ? 'rounded-[10px] px-[14px] py-3' : 'rounded-[12px] px-[14px] py-[13px]'
  return `flex w-full items-center gap-[10px] border bg-hc-n-0 ${forma} ${error ? 'border-hc-danger' : 'border-hc-n-200'}`
}

type CampoTextoProps = {
  id: string
  describedBy?: string
  valor: string
  onCambiar: (valor: string) => void
  onBlur?: () => void
  icono?: string
  escritorio: boolean
  error?: boolean
  tipo?: string
  autoComplete?: string
  inputMode?: 'text' | 'tel' | 'email' | 'numeric'
  maxLength?: number
  placeholder?: string
}

/** Campo de texto: con ícono en móvil, sin ícono en escritorio (Figma `28:1112`, `30:2410`). */
export function CampoTexto({ id, describedBy, valor, onCambiar, onBlur, icono, escritorio, error, tipo = 'text', autoComplete, inputMode, maxLength, placeholder }: CampoTextoProps) {
  return (
    <div className={claseCaja(escritorio, Boolean(error))}>
      {icono && !escritorio && <IconoFigma src={icono} size={18} className="text-hc-n-500" />}
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error || undefined}
        aria-describedby={describedBy}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        className="hc-input-libre min-w-0 flex-1 bg-transparent text-[15px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
      />
    </div>
  )
}

type CampoSelectorProps = {
  id: string
  describedBy?: string
  valor: string
  opciones: string[]
  placeholder: string
  onCambiar: (valor: string) => void
  onBlur?: () => void
  escritorio: boolean
  error?: boolean
  deshabilitado?: boolean
}

/** Selector nativo con el chevron del Figma (`29:1324`). */
export function CampoSelector({ id, describedBy, valor, opciones, placeholder, onCambiar, onBlur, escritorio, error, deshabilitado }: CampoSelectorProps) {
  return (
    <div className={`relative ${claseCaja(escritorio, Boolean(error))}`}>
      <select
        id={id}
        value={valor}
        disabled={deshabilitado}
        onChange={(e) => onCambiar(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error || undefined}
        aria-describedby={describedBy}
        className={`hc-input-libre min-w-0 flex-1 appearance-none bg-transparent text-[15px] leading-[18px] outline-none disabled:cursor-not-allowed ${valor ? 'text-hc-n-900' : 'text-hc-n-600'}`}
      >
        <option value="">{placeholder}</option>
        {opciones.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
      </select>
      <IconoFigma src={ICONOS_COMPRADOR.chevronAbajo} size={16} className="pointer-events-none text-hc-n-900" />
    </div>
  )
}
