export default function AiControlToggle({ activo, onChange, disabled }: {
  activo?: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" onClick={onChange} disabled={disabled}
      className="relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 disabled:opacity-40"
      style={{ backgroundColor: activo ? '#34d399' : 'rgba(255,255,255,0.15)' }}>
      <span className="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mt-0.5"
        style={{ transform: activo ? 'translateX(22px)' : 'translateX(2px)' }} />
    </button>
  )
}
