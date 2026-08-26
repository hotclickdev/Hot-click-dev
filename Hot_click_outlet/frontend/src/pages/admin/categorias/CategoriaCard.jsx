import { useState } from 'react'
import CategoriaGlyph from '@/pages/catalogo/CategoriaGlyph'
import { inicialDeCategoria } from './formCategoria'

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

function ChevronIcon({ abierto }) {
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

function SubcategoriaItem({ subcategoria, onEdit, onDelete }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-xl group"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#e8e8ed] truncate">{subcategoria.nombreCategoria}</p>
        {subcategoria.descripcion && (
          <p className="text-[11px] text-[#8e8e9a] truncate">{subcategoria.descripcion}</p>
        )}
      </div>
      <div className="flex gap-0.5 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={() => onEdit(subcategoria)}
          className="p-1 text-[#8e8e9a] hover:text-white rounded" title="Editar">
          <EditIcon />
        </button>
        <button type="button" onClick={() => onDelete(subcategoria)}
          className="p-1 text-[#8e8e9a] hover:text-red-400 rounded" title="Eliminar">
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

function SubcategoriasGrid({ hijos, abierto, onEdit, onDelete }) {
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

export default function CategoriaCard({ node, onEdit, onDelete, onAddSub }) {
  const [abierto, setAbierto] = useState(true)
  const tieneHijas = node.children.length > 0

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(23,71,168,0.2)', backgroundColor: '#0e0e12' }}>
      <div className="flex items-center justify-between px-4 py-3.5"
        style={{ backgroundColor: 'rgba(23,71,168,0.07)', borderBottom: tieneHijas && abierto ? '1px solid rgba(23,71,168,0.12)' : 'none' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
            style={{ backgroundColor: 'rgba(23,71,168,0.15)', color: 'var(--hc-accent)' }}>
            {node.icono
              ? <CategoriaGlyph icono={node.icono} nombre={node.nombreCategoria} className="w-4 h-4" />
              : inicialDeCategoria(node.nombreCategoria)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#e8e8ed] text-sm truncate">{node.nombreCategoria}</p>
            {node.descripcion && (
              <p className="text-xs text-[#8e8e9a] truncate">{node.descripcion}</p>
            )}
          </div>
          {tieneHijas && (
            <span className="ml-1 shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(23,71,168,0.15)', color: '#7aa3ff' }}>
              {node.children.length} sub
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button type="button" onClick={() => onAddSub(node)}
            className="px-2 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: '#7aa3ff' }}
            title="Agregar subcategoría">
            + sub
          </button>
          <button type="button" onClick={() => onEdit(node)}
            className="p-1.5 text-[#8e8e9a] hover:text-white hover:bg-white/8 rounded-lg transition-colors"
            title="Editar">
            <EditIcon />
          </button>
          <button type="button" onClick={() => onDelete(node)}
            className="p-1.5 text-[#8e8e9a] hover:text-red-400 hover:bg-red-500/8 rounded-lg transition-colors"
            title="Eliminar">
            <TrashIcon />
          </button>
          {tieneHijas && (
            <button type="button" onClick={() => setAbierto((prev) => !prev)}
              className="p-1.5 text-[#8e8e9a] hover:text-white rounded-lg transition-colors"
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
