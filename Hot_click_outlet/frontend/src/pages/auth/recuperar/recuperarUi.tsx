import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IconoFlechaAtras } from './iconosRecuperar'
import { PASOS, type Paso } from './recuperarHelpers'

/** Piezas compartidas por las 3 pantallas de "Recuperar contraseña" (Figma 44:1551 / 44:1580 / 44:1614). */

export function BarraRecuperar({ onVolver }: { onVolver: () => void }) {
  const { t } = useTranslation()
  return (
    <header className="w-full border-b border-hc-n-200 bg-hc-n-0 px-4 py-[14px]">
      <div className="mx-auto flex w-full max-w-md items-center gap-3">
        <button type="button" onClick={onVolver} aria-label={t('forgot.back')}
          className="-m-1 flex shrink-0 items-center justify-center rounded-lg p-1 text-hc-n-900 hover:bg-hc-n-100">
          <IconoFlechaAtras />
        </button>
        <p className="flex-1 font-display text-[17px] font-bold text-hc-n-900">{t('forgot.title')}</p>
      </div>
    </header>
  )
}

export function PasosRecuperar({ actual }: { actual: Paso }) {
  const { t } = useTranslation()
  const indice = PASOS.indexOf(actual)
  return (
    <div className="flex w-full items-center gap-[6px]" role="progressbar" aria-valuemin={1}
      aria-valuemax={PASOS.length} aria-valuenow={indice + 1}
      aria-label={t('forgot.stepsLabel', { actual: indice + 1, total: PASOS.length })}>
      {PASOS.map((paso, i) => (
        <span key={paso} className={`h-1 flex-1 rounded-[2px] ${i <= indice ? 'bg-hc-blue-600' : 'bg-hc-n-200'}`} />
      ))}
    </div>
  )
}

export function IconoCirculo({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-hc-blue-600">
      {children}
    </span>
  )
}

export function TituloRecuperar({ children }: { children: ReactNode }) {
  return <h1 className="w-full font-display text-[22px] font-bold leading-[28px] text-hc-n-900">{children}</h1>
}

export function TextoRecuperar({ children }: { children: ReactNode }) {
  return <p className="w-full text-[14px] leading-5 text-hc-n-600">{children}</p>
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string
  icono: ReactNode
  /** Botón o ícono al final de la entrada (ej. mostrar contraseña). */
  final?: ReactNode
}

/** Campo del Figma: etiqueta 13px, entrada con ícono y borde azul de 2px al enfocar. */
export function CampoRecuperar({ etiqueta, icono, final, id, ...props }: CampoProps) {
  const generado = useId()
  const inputId = id ?? generado
  return (
    <div className="flex w-full flex-col gap-[6px]">
      <label htmlFor={inputId} className="text-[13px] font-semibold text-hc-n-600">{etiqueta}</label>
      <div className="flex w-full items-center gap-[10px] rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px]
        focus-within:border-hc-blue-600 focus-within:shadow-[inset_0_0_0_1px_var(--hc-blue-600)]">
        <span className="flex shrink-0 text-hc-n-600">{icono}</span>
        <input id={inputId} {...props}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-hc-n-900 outline-none placeholder:text-hc-n-500" />
        {final}
      </div>
    </div>
  )
}

export function BotonRecuperar({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" disabled={disabled}
      className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 py-[14px] text-[15px] font-semibold text-hc-n-0
        transition-colors hover:bg-hc-red-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-hc-red-500">
      {children}
    </button>
  )
}

export function NotaRecuperar({ children, tono = 'neutra' }: { children: ReactNode; tono?: 'neutra' | 'azul' }) {
  const clases = tono === 'azul' ? 'bg-hc-blue-50 text-hc-blue-600' : 'bg-hc-n-100 text-hc-n-600'
  return <p className={`w-full rounded-[10px] px-3 py-[10px] text-[12px] leading-[17px] ${clases}`}>{children}</p>
}

export function ErrorRecuperar({ mensaje }: { mensaje: string }) {
  if (!mensaje) return null
  return <p role="alert" className="w-full text-[13px] leading-[18px] text-hc-danger">{mensaje}</p>
}
