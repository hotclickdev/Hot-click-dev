import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { buildCategoryTree } from './catalogoHelpers'
import CategoryRow from './CategoryRow'
import EmprendimientosRow from './EmprendimientosRow'
import ParentCategoryRow from './ParentCategoryRow'
import type { Producto } from '@/types/producto'
import type {
  CatalogCategoria,
  CatalogChildItem,
  CatalogEmpRow,
  CatalogLeafRow,
  CatalogParentRow,
  CatalogRow,
} from './catalogoTipos'

// ── Vista por filas de categoría (modo exploración sin filtros) ───────────────
export default function CategoryRowsView({
  products, categories, convenioMarcaNames, onVerMas, onVerEmprendimientos, onQuickView, page,
}: {
  products: Producto[]
  categories: CatalogCategoria[]
  convenioMarcaNames: Set<string>
  onVerMas: (catId: unknown) => void
  onVerEmprendimientos: () => void
  onQuickView: (product: Producto) => void
  page: number
}) {
  const emprendimientosProducts = useMemo(
    () => products.filter(p => convenioMarcaNames.has(p.marcaNombre?.toLowerCase())),
    [products, convenioMarcaNames]
  )

  const categoryRows = useMemo(() => {
    const tree = buildCategoryTree(categories)
    const result: (CatalogParentRow | CatalogLeafRow)[] = []

    // IDs presentes en el árbol (raíz + hijos directos)
    const treeIds = new Set<string>()
    tree.forEach(r => {
      treeIds.add(String(r.id))
      r.children?.forEach(c => treeIds.add(String(c.id)))
    })

    tree.forEach(parent => {
      if ((parent.children?.length ?? 0) > 0) {
        // Categoría padre con hijos: 1 producto representativo por hijo
        const childItems = parent.children
          .map(child => {
            const childProds = products.filter(p => String(p.categoriaId) === String(child.id))
            if (childProds.length === 0) return null
            return {
              childId: child.id,
              childName: child.nombreCategoria ?? child.nombre ?? '',
              product: childProds[0],
              count: childProds.length,
            } satisfies CatalogChildItem
          })
          .filter((item): item is CatalogChildItem => Boolean(item))

        if (childItems.length > 0) {
          result.push({
            type: 'parent',
            catId: parent.id,
            catName: parent.nombreCategoria ?? parent.nombre ?? '',
            childItems,
            totalCount: childItems.reduce((s, i) => s + i.count, 0),
          })
        }
      } else {
        // Categoría hoja sin hijos
        const catProds = products.filter(p => String(p.categoriaId) === String(parent.id))
        if (catProds.length > 0) {
          result.push({
            type: 'leaf',
            catId: parent.id,
            catName: parent.nombreCategoria ?? parent.nombre ?? '',
            products: catProds,
            totalCount: catProds.length,
          })
        }
      }
    })

    // Productos huérfanos (sin categoría o en categoría fuera del árbol)
    const orphans = products.filter(p => !p.categoriaId || !treeIds.has(String(p.categoriaId)))
    if (orphans.length > 0) {
      result.push({
        type: 'leaf',
        catId: '__otros__',
        catName: 'Otros productos',
        products: orphans,
        totalCount: orphans.length,
      })
    }

    return result.sort((a, b) => b.totalCount - a.totalCount)
  }, [products, categories])

  const rows = useMemo(() => {
    const result: CatalogRow[] = []
    categoryRows.forEach((row, idx) => {
      result.push(row)
      if (idx === 1 && emprendimientosProducts.length > 0) {
        result.push({ type: 'emprendimientos' } satisfies CatalogEmpRow)
      }
    })
    if (emprendimientosProducts.length > 0 && categoryRows.length <= 1) {
      result.push({ type: 'emprendimientos' })
    }
    return result
  }, [categoryRows, emprendimientosProducts])

  if (rows.length === 0) return null

  return (
    <motion.div key={`cat-rows-p${page}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {rows.map((row) => (
        <FilaCatalogo
          key={row.type === 'emprendimientos' ? 'emp-row' : row.catId}
          row={row}
          emprendimientosProducts={emprendimientosProducts}
          onVerEmprendimientos={onVerEmprendimientos}
          onVerMas={onVerMas}
          onQuickView={onQuickView}
        />
      ))}
    </motion.div>
  )
}

function FilaCatalogo({
  row, emprendimientosProducts, onVerEmprendimientos, onVerMas, onQuickView,
}: {
  row: CatalogRow
  emprendimientosProducts: Producto[]
  onVerEmprendimientos: () => void
  onVerMas: (catId: unknown) => void
  onQuickView: (product: Producto) => void
}) {
  if (row.type === 'emprendimientos') {
    return (
      <EmprendimientosRow
        products={emprendimientosProducts}
        onVerEmprendimientos={onVerEmprendimientos}
      />
    )
  }
  if (row.type === 'parent') {
    return (
      <ParentCategoryRow
        catName={row.catName}
        catId={row.catId}
        childItems={row.childItems}
        totalCount={row.totalCount}
        onVerMas={onVerMas}
        onQuickView={onQuickView}
      />
    )
  }
  return (
    <CategoryRow
      catName={row.catName}
      catId={row.catId}
      products={row.products}
      onVerMas={onVerMas}
      onQuickView={onQuickView}
    />
  )
}
