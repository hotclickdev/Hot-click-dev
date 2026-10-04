import { XMarkIcon } from '@heroicons/react/24/outline'

type Props = Readonly<{
  titulo: string
  paso?: number
  total?: number
  onCerrar: () => void
}>

/**
 * Cabecera de 56 px del wizard de producto (D2-02): ✕, «Nuevo producto · n de 4» y barra.
 */
export default function CabeceraWizardProducto({ titulo, paso, total, onCerrar }: Props) {
  const conPasos = total != null && paso != null
  const etiqueta = conPasos ? `${titulo} · ${paso + 1} de ${total}` : titulo
  const pct = conPasos ? ((paso + 1) / total) * 100 : 0

  return (
    <header
      className="sticky top-0 z-30 -mx-5 border-b border-hc-border bg-hc-surface md:hidden"
      data-testid="cabecera-wizard-producto"
    >
      <div className="flex h-14 items-center gap-1 px-3">
        <button
          type="button"
          onClick={onCerrar}
          className="flex size-11 shrink-0 items-center justify-center text-hc-text"
          aria-label="Cerrar"
        >
          <XMarkIcon className="size-6" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate font-display text-[15px] font-bold text-hc-text">{etiqueta}</p>
      </div>
      {conPasos ? (
        <div className="h-1 bg-[var(--hc-n-100)]" aria-hidden>
          <div className="h-full bg-hc-primary transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </header>
  )
}
