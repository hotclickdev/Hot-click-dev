import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { claseBordeCodigo } from './codigoDescuentoHelpers'

/*
 * Tarjeta de regalo o cupón (Figma 04 · Comprar, 55:2220 válida · 55:2284 inválida).
 * Solo presentación: la validación sigue en ejecutarValidarGiftCard / ejecutarValidarCupon.
 */

const ANIMACION = { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 } }

/** Tarjeta contenedora con el encabezado del Figma (ícono de regalo + título). */
export function TarjetaCodigos({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-[10px] rounded-[14px] border border-hc-border bg-hc-surface p-4">
      <div className="flex w-full items-center gap-2">
        <IconoFigma src={ICONOS_COMPRADOR.codigoRegalo} size={20} className="text-hc-blue-600" />
        <h3 className="text-[15px] font-semibold text-hc-text">{titulo}</h3>
      </div>
      {children}
    </section>
  )
}

type CampoCodigoProps = {
  valor: string
  estado: string
  placeholder: string
  ariaLabel: string
  maxLength: number
  onCambiar: (valor: string) => void
  onAplicar: () => void
  onQuitar: () => void
  /** Aviso rojo del estado inválido (Figma 55:2309). */
  invalido: { titulo: string; ayuda?: string }
  /** Detalle verde del estado válido (Figma 55:2247). */
  detalleValido: ReactNode
  t: TFunction
}

/** Campo + botón Aplicar/Quitar + aviso del resultado. */
export function CampoCodigo({
  valor, estado, placeholder, ariaLabel, maxLength, onCambiar, onAplicar, onQuitar, invalido, detalleValido, t,
}: CampoCodigoProps) {
  const valido = estado === 'valid'
  const idAviso = `${ariaLabel.replace(/\s+/g, '-').toLowerCase()}-aviso`

  return (
    <div className="flex w-full flex-col gap-[10px]">
      <div className="flex w-full items-center gap-2">
        <div className={`flex min-w-0 flex-1 items-center rounded-[10px] border-[1.5px] bg-hc-surface px-3 py-[11px] ${claseBordeCodigo(estado)}`}>
          <input
            type="text"
            value={valor}
            onChange={(e) => onCambiar(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAplicar() } }}
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-invalid={estado === 'invalid'}
            aria-describedby={estado === 'invalid' || valido ? idAviso : undefined}
            maxLength={maxLength}
            className="min-w-0 flex-1 bg-transparent font-mono text-[14px] font-medium text-hc-text placeholder:font-sans placeholder:font-normal placeholder:text-hc-muted focus:outline-none"
          />
          {valido && <IconoFigma src={ICONOS_COMPRADOR.codigoCheck} size={18} className="text-hc-success" />}
        </div>
        {valido ? (
          <button
            type="button"
            onClick={onQuitar}
            className="shrink-0 rounded-[10px] bg-hc-surface-2 px-[14px] py-[11px] text-[14px] font-semibold text-hc-text"
          >
            {t('checkout.codigo.quitar')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onAplicar}
            disabled={estado === 'loading' || !valor.trim()}
            className="shrink-0 rounded-[10px] bg-hc-blue-600 px-[14px] py-[11px] text-[14px] font-semibold text-hc-n-0 disabled:opacity-40"
          >
            {estado === 'loading' ? t('checkout.codigo.validando') : t('checkout.codigo.aplicar')}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {estado === 'invalid' && (
          <motion.div
            key="invalido"
            id={idAviso}
            role="alert"
            {...ANIMACION}
            className="flex w-full items-start gap-2 rounded-[10px] bg-hc-danger-bg p-3"
          >
            <IconoFigma src={ICONOS_COMPRADOR.codigoError} size={16} className="text-hc-danger" />
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <p className="text-[13px] font-semibold text-hc-red-600">{invalido.titulo}</p>
              {invalido.ayuda && (
                <p className="text-[12px] leading-4 text-hc-text-secondary">{invalido.ayuda}</p>
              )}
            </div>
          </motion.div>
        )}
        {valido && (
          <motion.div
            key="valido"
            id={idAviso}
            {...ANIMACION}
            className="flex w-full flex-col gap-[6px] rounded-[10px] bg-hc-success-bg p-3"
          >
            {detalleValido}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Encabezado del detalle válido: check + título en verde. */
export function TituloValido({ texto }: { texto: string }) {
  return (
    <div className="flex w-full items-center gap-[6px]">
      <IconoFigma src={ICONOS_COMPRADOR.codigoValidado} size={16} className="text-hc-success" />
      <p className="text-[13px] font-semibold text-hc-success">{texto}</p>
    </div>
  )
}

/** Línea etiqueta/monto del detalle válido y del resumen. */
export function LineaCodigo({ etiqueta, valor, rebaja = false }: { etiqueta: string; valor: string; rebaja?: boolean }) {
  return (
    <div className="flex w-full items-center justify-between gap-2 text-[13px]">
      <span className="text-hc-text-secondary">{etiqueta}</span>
      <span className={`shrink-0 font-medium ${rebaja ? 'text-hc-success' : 'text-hc-text'}`}>{valor}</span>
    </div>
  )
}
