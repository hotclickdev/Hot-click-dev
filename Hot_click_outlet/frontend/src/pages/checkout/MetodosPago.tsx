import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from './iconosCompra'
import type { MetodoPago } from './validacionCompra'

type Metodo = {
  valor: MetodoPago
  icono: string
  colorIcono: string
  titulo: string
  detalleMovil: string | null
  tituloDesktop: string
  detalleDesktop: string
  deshabilitado: boolean
}

type MetodosPagoProps = {
  elegido: MetodoPago
  onElegir: (metodo: MetodoPago) => void
  efectivoDisponible: boolean
  /** Instrucciones de SINPE; en móvil van dentro de su tarjeta y en desktop debajo de las tres. */
  instruccionesSinpe: ReactNode
}

function useMetodos(efectivoDisponible: boolean): Metodo[] {
  const { t } = useTranslation()
  return [
    {
      valor: 'SINPE', icono: ICONOS_COMPRA.sinpe, colorIcono: 'text-hc-blue-600', titulo: t('compra.pago.sinpe'),
      detalleMovil: null, tituloDesktop: t('compra.pago.sinpe'), detalleDesktop: t('compra.pago.sinpeDetalle'), deshabilitado: false,
    },
    {
      valor: 'TILOPAY', icono: ICONOS_COMPRA.tarjeta, colorIcono: 'text-hc-n-600', titulo: t('compra.pago.tarjeta'),
      detalleMovil: t('compra.pago.tarjetaDetalle'), tituloDesktop: t('compra.pago.tarjetaCorto'), detalleDesktop: t('compra.pago.tarjetaDetalleCorto'), deshabilitado: false,
    },
    {
      valor: 'EFECTIVO', icono: ICONOS_COMPRA.efectivo, colorIcono: 'text-hc-n-600', titulo: t('compra.pago.efectivo'),
      detalleMovil: t('compra.pago.efectivoDetalle'), tituloDesktop: t('compra.pago.efectivo'), detalleDesktop: t('compra.pago.efectivoDetalle'),
      deshabilitado: !efectivoDisponible,
    },
  ]
}

function RadioPago({ elegido }: { elegido: boolean }) {
  return (
    <span
      aria-hidden
      className={`size-[22px] shrink-0 rounded-[11px] bg-hc-n-0 ${elegido ? 'border-[6px] border-hc-blue-600' : 'border-[1.5px] border-[#9aa1ae]'}`}
    />
  )
}

function TarjetaMovil({ metodo, elegido, onElegir, children }: { metodo: Metodo; elegido: boolean; onElegir: () => void; children?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className={`flex flex-col gap-[12px] rounded-[14px] p-[14px] ${elegido ? 'border-2 border-hc-blue-600 bg-hc-blue-50' : 'border border-hc-n-200 bg-hc-n-0'} ${metodo.deshabilitado ? 'opacity-50' : ''}`}>
      <button
        type="button"
        role="radio"
        aria-checked={elegido}
        disabled={metodo.deshabilitado}
        onClick={onElegir}
        className="flex w-full items-center gap-[12px] text-left disabled:cursor-not-allowed"
      >
        <RadioPago elegido={elegido} />
        <span className={`flex ${metodo.colorIcono}`}><IconoFigma src={metodo.icono} size={20} /></span>
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="flex items-center gap-[8px] text-[14px] font-semibold text-hc-n-900">
            {metodo.titulo}
            {metodo.valor === 'SINPE' ? (
              <span className="ml-auto rounded-full bg-hc-green-50 px-[7px] py-[2px] text-[10px] font-semibold text-hc-success-text">{t('compra.pago.masUsado')}</span>
            ) : null}
          </span>
          {metodo.detalleMovil ? <span className="text-[12px] text-hc-n-600">{metodo.detalleMovil}</span> : null}
        </span>
      </button>
      {elegido ? children : null}
    </div>
  )
}

function TarjetaDesktop({ metodo, elegido, onElegir }: { metodo: Metodo; elegido: boolean; onElegir: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegido}
      disabled={metodo.deshabilitado}
      onClick={onElegir}
      className={`flex min-w-0 flex-1 flex-col items-start gap-[4px] rounded-[12px] p-[14px] text-left disabled:cursor-not-allowed disabled:opacity-50 ${elegido ? 'border-2 border-hc-blue-600 bg-hc-blue-50' : 'border border-hc-n-200 bg-hc-n-0'}`}
    >
      <span className={`flex ${metodo.colorIcono}`}><IconoFigma src={metodo.icono} size={20} /></span>
      <span className="text-[14px] font-semibold text-hc-n-900">{metodo.tituloDesktop}</span>
      <span className="text-[12px] text-hc-n-600">{metodo.detalleDesktop}</span>
    </button>
  )
}

/** Métodos de pago: móvil `29:1344`, desktop `30:2473`. El efectivo solo aplica si todo se retira en tienda. */
export default function MetodosPago({ elegido, onElegir, efectivoDisponible, instruccionesSinpe }: MetodosPagoProps) {
  const { t } = useTranslation()
  const metodos = useMetodos(efectivoDisponible)
  return (
    <>
      <div role="radiogroup" aria-label={t('compra.pago.titulo')} className="flex flex-col gap-[12px] lg:hidden">
        {metodos.map((metodo) => (
          <TarjetaMovil key={metodo.valor} metodo={metodo} elegido={elegido === metodo.valor} onElegir={() => onElegir(metodo.valor)}>
            {metodo.valor === 'SINPE' ? instruccionesSinpe : null}
          </TarjetaMovil>
        ))}
      </div>
      <div role="radiogroup" aria-label={t('compra.pago.titulo')} className="hidden gap-[12px] lg:flex">
        {metodos.map((metodo) => (
          <TarjetaDesktop key={metodo.valor} metodo={metodo} elegido={elegido === metodo.valor} onElegir={() => onElegir(metodo.valor)} />
        ))}
      </div>
      {elegido === 'SINPE' ? <div className="hidden lg:block">{instruccionesSinpe}</div> : null}
    </>
  )
}
