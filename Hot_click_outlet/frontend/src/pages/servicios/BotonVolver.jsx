export default function BotonVolver({ onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition-opacity hover:opacity-70"
      style={{ color: 'var(--hc-muted)' }}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Volver a servicios
    </button>
  )
}
