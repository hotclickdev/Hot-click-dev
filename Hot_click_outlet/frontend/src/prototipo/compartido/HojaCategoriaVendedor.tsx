import { useEffect, useMemo, useState } from 'react'
import HojaInferior from '@/components/comprador/HojaInferior'
import { categoriaService } from '@/services/orderService'
import {
  filtrarCategorias,
  listaCategoriasVendedor,
  nombreCategoriaVendedor,
  type CategoriaVendedor,
} from './categoriaVendedor'

type Props = Readonly<{
  categoriaId: string
  onChange: (id: string, nombre: string) => void
}>

/**
 * Categoría en hoja inferior con buscador (D2-02). En escritorio se usan los chips.
 */
export default function HojaCategoriaVendedor({ categoriaId, onChange }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [busqueda, setBusqueda] = useState('')
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
        if (vivo) setEstado('error')
      })
    return () => { vivo = false }
  }, [])

  const visibles = useMemo(() => filtrarCategorias(categorias, busqueda), [categorias, busqueda])
  const elegida = categorias.find((c) => String(c.id) === categoriaId)
  const etiqueta = elegida ? nombreCategoriaVendedor(elegida) : 'Elegí categoría'

  function elegir(cat: CategoriaVendedor) {
    onChange(String(cat.id), nombreCategoriaVendedor(cat))
    setAbierta(false)
  }

  return (
    <div className="md:hidden">
      <p className="mb-2 text-xs font-medium text-hc-muted">Categoría</p>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-hc-border bg-hc-surface-2 px-3.5 text-left text-sm text-hc-text"
      >
        <span>{etiqueta}</span>
        <span aria-hidden className="text-hc-muted">›</span>
      </button>
      <HojaInferior
        abierta={abierta}
        onCerrar={() => setAbierta(false)}
        titulo={<h2 className="font-display text-lg font-bold">Categoría</h2>}
      >
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscá una categoría"
          className="min-h-11 w-full rounded-xl border border-hc-border bg-hc-surface-2 px-3 text-sm outline-none focus:border-[var(--hc-b-600)]"
          autoComplete="off"
        />
        {estado === 'cargando' ? <p className="text-sm text-hc-muted">Cargando categorías…</p> : null}
        {estado === 'error' ? <p className="text-sm text-hc-danger">No se pudieron cargar las categorías.</p> : null}
        {estado === 'listo' && categorias.length === 0 ? (
          <p className="text-sm text-hc-danger">
            No hay categorías. Pedile a soporte que cree una antes de publicar.
          </p>
        ) : null}
        {estado === 'listo' && categorias.length > 0 && visibles.length === 0 ? (
          <p className="text-sm text-hc-muted">No hay categorías con ese nombre.</p>
        ) : null}
        <ul className="flex flex-col">
          {visibles.map((cat) => {
            const id = String(cat.id)
            const activa = categoriaId === id
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => elegir(cat)}
                  className={`flex min-h-11 w-full items-center border-b border-hc-border text-left text-sm ${
                    activa ? 'font-semibold text-[var(--hc-b-600)]' : 'text-hc-text'
                  }`}
                >
                  {nombreCategoriaVendedor(cat)}
                </button>
              </li>
            )
          })}
        </ul>
      </HojaInferior>
    </div>
  )
}
