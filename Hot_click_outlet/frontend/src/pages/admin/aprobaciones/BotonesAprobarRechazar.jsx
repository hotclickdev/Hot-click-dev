export default function BotonesAprobarRechazar({ disabled, onAprobar, onRechazar }) {
  return (
    <>
      <button type="button"
        onClick={onAprobar}
        disabled={disabled}
        className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#22c55e', color: '#fff' }}
      >
        Aprobar
      </button>
      <button type="button"
        onClick={onRechazar}
        disabled={disabled}
        className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: '#ef4444' }}
      >
        Rechazar
      </button>
    </>
  )
}
