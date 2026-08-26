import TextoFlecha from '@/components/ui/TextoFlecha'

export default function BotonVolver({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition-opacity hover:opacity-70"
      style={{ color: 'var(--hc-muted)' }}>
      <TextoFlecha dir="atras" iconClassName="w-4 h-4">Volver a servicios</TextoFlecha>
    </button>
  )
}
