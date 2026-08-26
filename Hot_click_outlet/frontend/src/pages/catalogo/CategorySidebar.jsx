import { useMemo } from 'react'
import { buildCategoryTree } from './catalogoHelpers'
import CategoriaGlyph from './CategoriaGlyph'
import TrustGlyph from '@/components/ui/TrustGlyph'

function IconoCategoriaNodo({ nodo, className = 'w-4 h-4 shrink-0' }) {
  if (!nodo?.icono) return null
  return (
    <CategoriaGlyph
      icono={nodo.icono}
      nombre={nodo.nombreCategoria ?? nodo.nombre}
      className={className}
    />
  )
}

// ── Sidebar de categorías y marcas ───────────────────────────────────────────
export default function CategorySidebar({
  categories, category, setCategory,
  categoryTotalCount,
  onCategorySelect,
}) {
  const tree = useMemo(
    () => buildCategoryTree(categories).filter(c => (categoryTotalCount?.[c.id] ?? 0) > 0),
    [categories, categoryTotalCount]
  )

  function handleCatSelect(id) {
    setCategory(id)
    onCategorySelect?.()
  }

  // Determina el nodo raíz "activo" para el modo drill-down
  const drilledNode = useMemo(() => {
    if (!category) return null
    const activeCat = categories.find(c => String(c.id) === String(category))
    if (!activeCat) return null
    if (activeCat.padreId) {
      return tree.find(r => String(r.id) === String(activeCat.padreId)) ?? null
    }
    const rootNode = tree.find(r => String(r.id) === String(activeCat.id))
    return rootNode?.children?.length > 0 ? rootNode : null
  }, [category, categories, tree])

  return (
    <div className="space-y-6">
      {/* Categorías */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-1"
          style={{ color: 'var(--hc-muted)' }}>Categorías</p>
        <div className="space-y-0.5">
          {drilledNode ? (
            /* ── Modo drill-down: muestra padre + hijos + otras categorías padre ── */
            <>
              {/* Padre activo + hijos */}
              <button type="button"
                onClick={() => handleCatSelect(String(drilledNode.id))}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                style={String(category) === String(drilledNode.id)
                  ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                  : { color: 'var(--hc-text)' }
                }
              >
                <IconoCategoriaNodo nodo={drilledNode} />
                <span className="truncate flex-1">{drilledNode.nombreCategoria ?? drilledNode.nombre}</span>
                <span className="text-[10px] font-bold opacity-50 shrink-0">
                  {categoryTotalCount?.[drilledNode.id] ?? 0}
                </span>
              </button>
              {/* Hijos */}
              <div className="pl-3 mt-0.5 space-y-0.5">
                {drilledNode.children
                  .filter(sub => (categoryTotalCount?.[sub.id] ?? 0) > 0)
                  .map(sub => {
                    const subCount = categoryTotalCount?.[sub.id] ?? 0
                    return (
                      <button type="button" key={sub.id}
                        onClick={() => handleCatSelect(String(sub.id))}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                        style={String(category) === String(sub.id)
                          ? { background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)' }
                          : { color: 'var(--hc-muted)' }
                        }
                      >
                        <IconoCategoriaNodo nodo={sub} className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1 truncate">{sub.nombreCategoria ?? sub.nombre}</span>
                        <span className="text-[10px] font-bold opacity-50 shrink-0">{subCount}</span>
                      </button>
                    )
                  })}
              </div>

              {/* Separador + otras categorías padre */}
              {tree.filter(c => String(c.id) !== String(drilledNode.id)).length > 0 && (
                <>
                  <div className="my-3 mx-1 border-t" style={{ borderColor: 'var(--hc-border)' }} />
                  <button type="button"
                    onClick={() => handleCatSelect('')}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 mb-1"
                    style={!category
                      ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                      : { color: 'var(--hc-muted)' }
                    }
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    Todos los productos
                  </button>
                  {tree
                    .filter(c => String(c.id) !== String(drilledNode.id) && (categoryTotalCount?.[c.id] ?? 0) > 0)
                    .map(cat => (
                      <button type="button"
                        key={cat.id}
                        onClick={() => handleCatSelect(String(cat.id))}
                        className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 group"
                        style={{ color: 'var(--hc-text)' }}
                      >
                        <IconoCategoriaNodo nodo={cat} />
                        <span className="truncate flex-1">{cat.nombreCategoria ?? cat.nombre}</span>
                        <span className="text-[10px] font-bold opacity-50 shrink-0 ml-auto">
                          {categoryTotalCount?.[cat.id] ?? 0}
                        </span>
                        {cat.children?.length > 0 && (
                          <TrustGlyph tipo="adelante" className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    ))}
                </>
              )}
            </>
          ) : (
            /* ── Vista normal: todas las categorías ── */
            <>
              <button type="button"
                onClick={() => handleCatSelect('')}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={!category
                  ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                  : { color: 'var(--hc-text-2, var(--hc-text))' }
                }
              >
                Todos los productos
              </button>
              {tree.map(cat => {
                const catCount = categoryTotalCount?.[cat.id] ?? 0
                return (
                  <button type="button"
                    key={cat.id}
                    onClick={() => handleCatSelect(String(cat.id))}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 group"
                    style={String(category) === String(cat.id)
                      ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                      : { color: 'var(--hc-text)' }
                    }
                  >
                    <IconoCategoriaNodo nodo={cat} />
                    <span className="truncate flex-1">{cat.nombreCategoria ?? cat.nombre}</span>
                    <span className="text-[10px] font-bold opacity-50 shrink-0 ml-auto">{catCount}</span>
                    {cat.children?.length > 0 && (
                      <TrustGlyph tipo="adelante" className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>

    </div>
  )
}
