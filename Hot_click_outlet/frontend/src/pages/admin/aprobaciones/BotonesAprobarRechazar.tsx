export default function BotonesAprobarRechazar({ disabled, onAprobar, onRechazar, dataMmAprobar }: {
  disabled: boolean
  onAprobar: () => void
  onRechazar: () => void
  dataMmAprobar?: string
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={onAprobar}
        disabled={disabled}
        data-mm={dataMmAprobar}
        className="flex min-h-10 items-center justify-center rounded-[10px] bg-[var(--hc-success-bg)] text-xs font-bold text-hc-success disabled:opacity-50"
      >
        Aprobar
      </button>
      <button
        type="button"
        onClick={onRechazar}
        disabled={disabled}
        className="flex min-h-10 items-center justify-center rounded-[10px] bg-[var(--hc-danger-bg)] text-xs font-bold text-hc-primary disabled:opacity-50"
      >
        Rechazar
      </button>
    </div>
  )
}
