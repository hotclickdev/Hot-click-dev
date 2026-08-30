import { useState } from 'react'
import CategoriaGlyph from '@/pages/catalogo/CategoriaGlyph'
import { inicialDeCategoria, type CategoriaNodo } from './formCategoria'

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function ChevronIcon({ abierto }: { abierto: boolean }) {
  return (
    <svg
      className="w-3.5 h-3.5 transition-transform"
      style={{ transform: abierto ? 'rotate(0deg)' : 'rotate(-90deg)' }}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

type AccionCategoria = (categoria: CategoriaNodo) => void

function SubcategoriaItem({ subcategoria, onEdit, onDelete }: {
  subcategoria: CategoriaNodo
  onEdit: AccionCategoria
  onDelete: AccionCategoria
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-hc-border bg-hc-surface-2 px-3 py-2.5 group"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-hc-text">{subcategoria.nombreCategoria}</p>
        {subcategoria.descripcion && (
          <p className="truncate text-[11px] text-hc-muted">{subcategoria.descripcion}</p>
        )}
      </div>
      <div className="ml-1 flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={() => onEdit(subcategoria)}
          className="rounded p-1 text-hc-muted hover:text-hc-text" title="Editar">
          <EditIcon />
        </button>
        <button type="button" onClick={() => onDelete(subcategoria)}
          className="rounded p-1 text-hc-muted hover:text-hc-danger" title="Eliminar">
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

function SubcategoriasGrid({ hijos, abierto, onEdit, onDelete }: {
  hijos: CategoriaNodo[]
  abierto: boolean
  onEdit: AccionCategoria
  onDelete: AccionCategoria
}) {
  if (!hijos.length || !abierto) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
      {hijos.map((subcategoria) => (
        <SubcategoriaItem
          key={subcategoria.id}
          subcategoria={subcategoria}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

export type CategoriaCardProps = {
  node: CategoriaNodo
  onEdit: AccionCategoria
  onDelete: AccionCategoria
  onAddSub: AccionCategoria
}

export default function CategoriaCard({ node, onEdit, onDelete, onAddSub }: CategoriaCardProps) {
  const [abierto, setAbierto] = useState(true)
  const tieneHijas = node.children.length > 0

  return (
    <div className="overflow-hidden rounded-xl border border-hc-border bg-hc-surface">
      <div className="flex items-center justify-between px-3.5 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-hc-surface-2 text-sm font-bold text-hc-muted">
            {node.icono
              ? <CategoriaGlyph icono={node.icono} nombre={node.nombreCategoria} className="h-4 w-4" />
              : inicialDeCategoria(node.nombreCategoria)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-hc-text">{node.nombreCategoria}</p>
            {node.descripcion && (
              <p className="truncate text-xs text-hc-muted">{node.descripcion}</p>
            )}
          </div>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          {tieneHijas && (
            <span className="text-[11px] text-hc-muted">{node.children.length} sub</span>
          )}
          <button type="button" onClick={() => onAddSub(node)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-hc-muted hover:text-hc-text"
            title="Agregar subcategoría">
            + sub
          </button>
          <button type="button" onClick={() => onEdit(node)}
            className="rounded-lg p-1.5 text-hc-muted hover:text-hc-text"
            title="Editar">
            <EditIcon />
          </button>
          <button type="button" onClick={() => onDelete(node)}
            className="rounded-lg p-1.5 text-hc-muted hover:text-hc-danger"
            title="Eliminar">
            <TrashIcon />
          </button>
          {tieneHijas && (
            <button type="button" onClick={() => setAbierto((prev) => !prev)}
              className="rounded-lg p-1.5 text-hc-muted hover:text-hc-text"
              title={abierto ? 'Ocultar subcategorías' : 'Mostrar subcategorías'}>
              <ChevronIcon abierto={abierto} />
            </button>
          )}
        </div>
      </div>

      <SubcategoriasGrid
        hijos={node.children}
        abierto={abierto}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}
