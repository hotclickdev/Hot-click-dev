import { useState, useEffect } from 'react'
import type { Id } from '@/types/api'

type CategoriaArbol = {
  id: Id
  nombreCategoria?: string
  padreId?: Id | null
}

type CategoriaSelectProps = {
  categories?: CategoriaArbol[]
  value?: Id | null | ''
  onChange: (id: string) => void
  required?: boolean
  className?: string
}

/**
 * Selector de categoría en cascada (árbol ilimitado).
 * Props:
 *   categories  - lista plana de categorías con { id, nombreCategoria, padreId }
 *   value       - categoriaId actualmente seleccionado
 *   onChange    - callback(id) cuando cambia la selección
 *   required    - si el primer nivel es requerido
 *   className   - clase CSS extra para los selects
 */
export default function CategoriaSelect({ categories = [], value, onChange, required, className = '' }: CategoriaSelectProps) {
  const childrenOf = (id: Id | string) =>
    categories.filter((c) => String(c.padreId) === String(id))

  const roots = categories.filter((c) => !c.padreId)

  function buildPath(id: Id | null | undefined | ''): string[] {
    if (!id) return []
    const cat = categories.find((c) => String(c.id) === String(id))
    if (!cat) return []
    if (!cat.padreId) return [String(id)]
    return [...buildPath(cat.padreId), String(id)]
  }

  const [path, setPath] = useState(() => buildPath(value))

  useEffect(() => {
    setPath(buildPath(value))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleSelect(level: number, selectedId: string) {
    if (selectedId) {
      const newPath = [...path.slice(0, level), selectedId]
      setPath(newPath)
      onChange(selectedId)
    } else {
      const newPath = path.slice(0, level)
      setPath(newPath)
      onChange(newPath[newPath.length - 1] || '')
    }
  }

  const sel = `h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60 ${className}`

  return (
    <div className="space-y-2">
      {/* Nivel raíz */}
      <select
        value={path[0] || ''}
        onChange={(e) => handleSelect(0, e.target.value)}
        className={sel}
        required={required}
      >
        <option value="">Selecciona categoría</option>
        {roots.map((c) => (
          <option key={c.id} value={c.id}>{c.nombreCategoria}</option>
        ))}
      </select>

      {/* Niveles dinámicos: aparece si el nivel anterior tiene hijos */}
      {path.map((id, i) => {
        const kids = childrenOf(id)
        if (!kids.length) return null
        return (
          <select
            key={`lvl-${i + 1}`}
            value={path[i + 1] || ''}
            onChange={(e) => handleSelect(i + 1, e.target.value)}
            className={sel}
          >
            <option value="">Subcategoría (opcional)</option>
            {kids.map((c) => (
              <option key={c.id} value={c.id}>{c.nombreCategoria}</option>
            ))}
          </select>
        )
      })}
    </div>
  )
}
