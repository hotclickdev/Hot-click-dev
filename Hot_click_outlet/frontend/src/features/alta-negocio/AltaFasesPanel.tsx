import { FASES, TEXTO_BANNER, TEXTO_BOTON_ONVO, TEXTO_CUENTA_PERDIDA, estadoDeFase, etiquetaCuenta, mensajeDeFase, mostrarBotonOnvo, type EstadoAlta } from './altaFases'

type Props = {
  estado: EstadoAlta
  ocupado?: boolean
  error?: string
  onIrAOnvo?: () => void
}

const TONO = {
  ok: 'bg-hc-success-bg text-hc-success-text',
  alerta: 'bg-hc-danger-bg text-hc-primary-text',
  azul: 'bg-hc-blue-50 text-hc-blue-600',
  neutro: 'bg-hc-n-100 text-hc-n-600',
} as const

/** Stepper de las 5 fases del alta. Presentacional: recibe el estado ya leído del backend. */
export function StepperFases({ estado }: { estado: EstadoAlta }) {
  return (
    <ol aria-label="Fases del alta de su negocio" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
      {FASES.map((fase) => {
        const s = estadoDeFase(estado, fase.numero)
        const clase = s === 'actual'
          ? 'border-hc-blue-600 bg-hc-blue-50 text-hc-blue-900'
          : s === 'hecha'
            ? 'border-hc-success bg-hc-success-bg text-hc-success-text'
            : 'border-hc-n-200 bg-hc-surface text-hc-n-600'
        return (
          <li key={fase.id} data-fase={fase.id} data-estado={s} aria-current={s === 'actual' ? 'step' : undefined}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${clase}`}>
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-extrabold">
              {s === 'hecha' ? '✓' : fase.numero}
            </span>
            <span>{fase.titulo}</span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Aviso del panel del dueño: tienda en espera (amarillo), o pagos pausados por cuenta perdida (rojo).
 * Incluye la fase actual, el estado de la cuenta ONVO y el botón para ir a ONVO.
 */
export default function AltaFasesPanel({ estado, ocupado = false, error = '', onIrAOnvo }: Props) {
  const perdida = estado.cuentaPerdida
  const cuenta = etiquetaCuenta(estado.cuentaOnvo)
  const marco = perdida ? 'border-hc-danger bg-hc-danger-bg' : 'border-hc-warning bg-hc-warning-bg'
  return (
    <section role={perdida ? 'alert' : 'status'} aria-label="Estado del alta de su negocio" data-perdida={perdida ? 'si' : 'no'}
      className={`mb-5 rounded-[14px] border p-4 text-hc-n-900 ${marco}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[17px] font-bold leading-6">
          {perdida ? 'Sus pagos en línea están pausados' : TEXTO_BANNER}
        </h2>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONO[cuenta.tono]}`}>
          Cuenta ONVO: {cuenta.texto}
        </span>
      </div>
      <p className="mt-1 text-sm">{perdida ? TEXTO_CUENTA_PERDIDA : mensajeDeFase(estado)}</p>
      {perdida && <p className="mt-1 text-sm">Corrija sus datos en ONVO. Cuando la cuenta vuelva a estar activa, los pagos se reanudan solos.</p>}
      <StepperFases estado={estado} />
      {mostrarBotonOnvo(estado) && (
        <div className="mt-3">
          <button type="button" onClick={onIrAOnvo} disabled={ocupado}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-hc-primary px-4 text-[15px] font-semibold text-white disabled:opacity-60">
            {ocupado ? 'Abriendo ONVO…' : TEXTO_BOTON_ONVO}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-hc-primary-text">{error}</p>}
    </section>
  )
}
