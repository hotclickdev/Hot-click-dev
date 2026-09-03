import { Chip } from '@/prototipo/compartido/ui'

type Props<T extends string> = {
  valor: T
  opciones: readonly T[]
  onChange: (valor: T) => void
}

/**
 * Fila horizontal de chips de filtro (usa Chip de compartido/ui).
 */
export default function FilaChips<T extends string>({ valor, opciones, onChange }: Props<T>) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {opciones.map((opcion) => (
        <Chip key={opcion} activo={valor === opcion} onClick={() => onChange(opcion)}>
          {opcion}
        </Chip>
      ))}
    </div>
  )
}
