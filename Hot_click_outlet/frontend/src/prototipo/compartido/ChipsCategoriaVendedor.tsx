import { useEffect, useState } from 'react'
import { categoriaService } from '@/services/orderService'
import { Chip } from './ui'
import {
  listaCategoriasVendedor,
  nombreCategoriaVendedor,
  type CategoriaVendedor,
} from './categoriaVendedor'

type Props = Readonly<{
  categoriaId: string
  onChange: (id: string, nombre: string) => void
}>

/**
 * Chips de categorías reales (el backend exige categoriaId, no el label de Figma).
 */
export default function ChipsCategoriaVendedor({ categoriaId, onChange }: Props) {
  const [categorias, setCategorias] = useState<CategoriaVendedor[]>([])
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')

  useEffect(() => {
    let vivo = true
    categoriaService.getAll()
      .then((res) => {
        if (!vivo) return
        setCategorias(listaCategoriasVendedor(res.data))
        setEstado('listo')
      })
      .catch(() => {
        if (!vivo) return
        setEstado('error')
      })
    return () => { vivo = false }
  }, [])

  if (estado === 'cargando') {
    return <p className="text-sm text-hc-muted">Cargando categorías…</p>
  }
  if (estado === 'error') {
    return <p className="text-sm text-hc-danger">No se pudieron cargar las categorías.</p>
  }
  if (categorias.length === 0) {
    return (
      <p className="text-sm text-hc-danger">
        No hay categorías. Pedile a soporte que cree una antes de publicar.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Categoría">
      {categorias.map((cat) => {
        const id = String(cat.id)
        return (
          <Chip
            key={id}
            activo={categoriaId === id}
            onClick={() => onChange(id, nombreCategoriaVendedor(cat))}
          >
            {nombreCategoriaVendedor(cat)}
          </Chip>
        )
      })}
    </div>
  )
}
