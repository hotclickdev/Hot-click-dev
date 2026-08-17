import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Section from '@/components/ui/Section'

// ─── Sección "Explorar por categoría" estilo Amazon ──────────────────────────
export default function CategoryBrowse({ products, categories }) {
  // Agrupar productos por categoría y tomar las 8 categorías con más productos
  const catGroups = useMemo(() => {
    const map = {}
    products.forEach(p => {
      const catId = String(p.categoriaId ?? '')
      if (!catId) return
      if (!map[catId]) map[catId] = { products: [], catId }
      map[catId].products.push(p)
    })
    // Enriquecer con nombre de categoría
    return Object.values(map)
      .map(g => {
        const cat = categories.find(c => String(c.id ?? c.idCategoria) === g.catId)
        return { ...g, nombre: cat?.nombreCategoria ?? cat?.nombre ?? 'Sin nombre' }
      })
      .filter(g => g.products.length >= 1)
      .sort((a, b) => b.products.length - a.products.length)
      .slice(0, 8)
  }, [products, categories])

  if (catGroups.length === 0) return null

  return (
    <Section
      title="Elegí una categoría."
      subtitle="Hay mucho por explorar."
      action={{ label: 'Ver catálogo completo', to: '/productos' }}
      tone="surface"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {catGroups.map((group, gi) => (
          <motion.div
            key={group.catId}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: gi * 0.06 }}
          >
            <Link
              to={`/productos?cat=${group.catId}`}
              className="block rounded-2xl overflow-hidden transition-all hover:shadow-lg group"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              {/* Título */}
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-sm font-bold line-clamp-1 group-hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--hc-text)' }}>
                  {group.nombre}
                </h3>
              </div>

              {/* Grid 2×2 de imágenes de productos */}
              <div className="grid grid-cols-2 gap-px p-2 pt-1">
                {Array.from({ length: 4 }).map((_, i) => {
                  const prod = group.products[i]
                  return (
                    <div key={i} className="aspect-square overflow-hidden rounded-xl"
                      style={{ background: 'color-mix(in srgb, var(--hc-text) 4%, transparent)' }}>
                      {prod?.imagenUrl ? (
                        <img
                          src={prod.imagenUrl}
                          alt={prod.nombre ?? ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">
                          📦
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-3">
                <span className="text-xs font-semibold transition-opacity group-hover:opacity-60"
                  style={{ color: 'var(--hc-accent)' }}>
                  Ver {group.products.length} producto{group.products.length === 1 ? '' : 's'} →
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}
