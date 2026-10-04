import HojaInferior from '@/components/comprador/HojaInferior'

type Props = Readonly<{
  abierta: boolean
  onSeguir: () => void
  onSalir: () => void
}>

/** Confirma el ✕ si el formulario ya tiene datos. */
export default function HojaSalirWizard({ abierta, onSeguir, onSalir }: Props) {
  return (
    <HojaInferior
      abierta={abierta}
      onCerrar={onSeguir}
      titulo={<h2 className="font-display text-lg font-bold text-hc-text">¿Salís sin guardar?</h2>}
    >
      <p className="text-sm text-hc-muted">Si salís, se pierde lo que escribiste en este producto.</p>
      <button
        type="button"
        onClick={onSeguir}
        className="flex min-h-12 w-full items-center justify-center rounded-[14px] bg-hc-primary px-5 text-[15px] font-bold text-white"
      >
        Seguir editando
      </button>
      <button
        type="button"
        onClick={onSalir}
        className="flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-border bg-hc-surface text-[13px] font-medium text-hc-text"
      >
        Salir
      </button>
    </HojaInferior>
  )
}
