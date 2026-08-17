import { motion } from 'framer-motion'

/** @param {{ categorias: { nombre: string, cantidad?: number }[] }} props */
export default function CategoryBars({ categorias }) {
  if (categorias.length === 0) return null
  const maxCat = Math.max(...categorias.map((c) => c.cantidad ?? 0), 1)

  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-[#e8e8ed] mb-4">Productos por categoría</h2>
      <div className="space-y-2.5">
        {categorias.slice(0, 6).map((cat, i) => (
          <div key={cat.nombre} className="flex items-center gap-3">
            <span className="text-xs text-[#8e8e9a] w-28 truncate shrink-0">{cat.nombre}</span>
            <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((cat.cantidad ?? 0) / maxCat) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="h-full rounded-full"
                style={{ background: `hsl(${220 + i * 35}, 75%, 65%)` }}
              />
            </div>
            <span className="text-xs font-semibold text-[#e8e8ed] w-6 text-right shrink-0">
              {cat.cantidad}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
