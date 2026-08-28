export default function WizardProgress({ step, steps }: { step: number; steps: { optional?: boolean }[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>Paso {step + 1} de {steps.length}</span>
        {steps[step]?.optional && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--hc-muted)', backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>Opcional</span>
        )}
      </div>
      <div className="flex gap-1">
        {steps.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: colorBarraWizard(idx, step) }} />
        ))}
      </div>
    </div>
  )
}

function colorBarraWizard(idx: number, step: number) {
  if (idx < step) return 'var(--hc-accent)'
  if (idx === step) return 'rgba(23,71,168,0.5)'
  return 'var(--hc-border)'
}
