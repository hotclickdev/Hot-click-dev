import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, conditionLabel } from '@/utils/format'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const { t } = useTranslation()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState(null)
  const [justAdded, setJustAdded] = useState(false)
  const addTimeout = useRef(null)

  useEffect(() => {
    setLoading(true)
    productService.getById(id)
      .then(({ data }) => {
        const p = normalizeProduct(data)
        setProduct(p)
        // set default tab to the first one that has content
        if (p.especificaciones?.trim()) setActiveTab('especificaciones')
        else if (p.comoUsar?.trim()) setActiveTab('como-usar')
      })
      .catch(() => navigate('/productos'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => () => clearTimeout(addTimeout.current), [])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-32"><Spinner size="xl" /></div>
      </MainLayout>
    )
  }

  if (!product) return null

  const inStock = product.stock > 0
  const atMax = quantity >= product.stock

  const tabs = [
    product.especificaciones?.trim() ? { id: 'especificaciones', label: 'Especificaciones' } : null,
    product.comoUsar?.trim()        ? { id: 'como-usar',        label: 'Cómo usar' }         : null,
  ].filter(Boolean)

  const stockBadge = product.stock === 0 ? 'danger' : product.stock <= 3 ? 'warning' : 'success'
  const stockLabel = product.stock === 0
    ? t('product.outOfStock')
    : product.stock <= 3
    ? t('product.lowStock', { count: product.stock })
    : t('product.inStock')

  const handleDecrease = () => setQuantity((q) => Math.max(1, q - 1))

  const handleIncrease = () => {
    if (atMax) {
      toast({
        message: t('product.lowStock', { count: product.stock }),
        type: 'warning',
      })
      return
    }
    setQuantity((q) => q + 1)
  }

  const handleAdd = () => {
    if (!inStock || justAdded) return
    for (let i = 0; i < quantity; i++) addItem(normalizeProduct(product))
    toast({
      message: t('product.added', { name: `${quantity > 1 ? `${quantity}× ` : ''}${product.nombre}` }),
      type: 'success',
    })
    setJustAdded(true)
    addTimeout.current = setTimeout(() => setJustAdded(false), 1400)
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#8e8e9a] mb-8">
          <button onClick={() => navigate('/productos')} className="hover:text-white transition-colors">
            Productos
          </button>
          <span>/</span>
          <span className="text-[#e8e8ed] truncate max-w-xs">{product.titulo || product.nombre}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* ── Imagen ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="aspect-square rounded-2xl bg-[#111114] border border-white/8 flex items-center justify-center overflow-hidden"
          >
            {product.imagenUrl ? (
              <img src={product.imagenUrl} alt={product.nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl opacity-20">📦</span>
            )}
          </motion.div>

          {/* ── Info ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5"
          >
            {/* Título + badges */}
            <div className="space-y-2">
              {product.condicion && (
                <Badge variant={product.condicion === 'NUEVO' ? 'success' : 'warning'}>
                  {conditionLabel(product.condicion)}
                </Badge>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-[#e8e8ed] leading-tight">
                {product.titulo || product.nombre}
              </h1>
              {product.titulo && product.titulo !== product.nombre && (
                <p className="text-sm text-[#8e8e9a]">{product.nombre}</p>
              )}
              <Badge variant={stockBadge}>{stockLabel}</Badge>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
                ✓ Garantía 40 días
              </span>
            </div>

            {/* Precio */}
            <span className="text-4xl font-bold text-[#e8e8ed]">
              {formatPrice(product.precio)}
            </span>

            {/* Descripción */}
            {product.descripcion && (
              <p className="text-sm text-[#8e8e9a] leading-relaxed">{product.descripcion}</p>
            )}

            {/* ── Selector de cantidad ── */}
            {inStock && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#8e8e9a] shrink-0">Cantidad</span>

                <div className="flex items-center rounded-2xl border border-white/12 bg-white/4 overflow-hidden">
                  {/* Botón − */}
                  <motion.button
                    onClick={handleDecrease}
                    disabled={quantity <= 1}
                    whileTap={{ scale: 0.85 }}
                    className="w-12 h-12 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors select-none"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M5 12h14" />
                    </svg>
                  </motion.button>

                  {/* Número animado */}
                  <div className="w-12 flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={quantity}
                        initial={{ opacity: 0, y: -12, scale: 0.7 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.7 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="text-base font-bold text-[#e8e8ed] select-none"
                      >
                        {quantity}
                      </motion.span>
                    </AnimatePresence>
                  </div>

                  {/* Botón + */}
                  <motion.button
                    onClick={handleIncrease}
                    disabled={atMax}
                    whileTap={atMax ? { x: [0, 4, -4, 4, 0] } : { scale: 0.85 }}
                    transition={{ duration: 0.3 }}
                    className="w-12 h-12 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors select-none"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </motion.button>
                </div>

                {/* Label de stock */}
                <AnimatePresence mode="wait">
                  {atMax ? (
                    <motion.span
                      key="max"
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      className="text-xs font-medium text-amber-400"
                    >
                      Máximo disponible
                    </motion.span>
                  ) : (
                    <motion.span
                      key="stock"
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      className="text-xs text-[#8e8e9a]"
                    >
                      de {product.stock}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Botón añadir al carrito ── */}
            <motion.button
              onClick={handleAdd}
              disabled={!inStock}
              whileTap={inStock && !justAdded ? { scale: 0.97 } : {}}
              className={`relative h-14 rounded-2xl font-semibold text-sm overflow-hidden transition-all duration-300 ${
                !inStock
                  ? 'bg-white/5 text-[#8e8e9a] cursor-not-allowed border border-white/8'
                  : justAdded
                  ? 'bg-emerald-500 text-white shadow-[0_0_28px_rgba(16,185,129,0.45)]'
                  : 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white shadow-[0_0_20px_rgba(79,124,255,0.3)] hover:shadow-[0_0_36px_rgba(79,124,255,0.5)]'
              }`}
            >
              {/* Ripple al hacer click */}
              <AnimatePresence>
                {justAdded && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white pointer-events-none"
                  />
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {justAdded ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.6, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.6, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <motion.svg
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35, delay: 0.05 }}
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </motion.svg>
                    <span>Añadido</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="add"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center gap-2.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span>{inStock ? t('product.addToCart') : t('product.outOfStock')}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Info envío y confianza */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '🛡', text: 'Garantía 40 días' },
                { icon: '🔒', text: 'Pago 100% seguro' },
                { icon: '💬', text: 'Soporte WhatsApp' },
                { icon: '🚚', text: 'Envío a todo el país' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2 p-3 rounded-xl bg-white/3 border border-white/8 text-sm text-[#8e8e9a]">
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Tabs: Especificaciones / Cómo usar ── */}
        {tabs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mt-12"
          >
            {/* Tab bar */}
            <div className="flex gap-1 border-b border-white/10 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'text-white' : 'text-[#8e8e9a] hover:text-white'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f7cff] rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Contenido: Especificaciones */}
            <AnimatePresence mode="wait">
              {activeTab === 'especificaciones' && product.especificaciones?.trim() && (
                <motion.div
                  key="specs"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#111114] border border-white/8 rounded-2xl p-6"
                >
                  <ul className="space-y-3">
                    {product.especificaciones.split('\n').filter((l) => l.trim()).map((linea, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#4f7cff] shrink-0" />
                        <span className="text-[#c8c8d0]">{linea.replace(/^[-•·]\s*/, '')}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Contenido: Cómo usar */}
              {activeTab === 'como-usar' && product.comoUsar?.trim() && (
                <motion.div
                  key="howto"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#111114] border border-white/8 rounded-2xl p-6"
                >
                  <ol className="space-y-5">
                    {product.comoUsar.split('\n').filter((l) => l.trim()).map((linea, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-4"
                      >
                        <span className="shrink-0 w-7 h-7 rounded-full bg-[#4f7cff]/15 border border-[#4f7cff]/30 text-[#4f7cff] text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm text-[#c8c8d0] pt-1 leading-relaxed">
                          {linea.replace(/^\d+\.\s*/, '')}
                        </span>
                      </motion.li>
                    ))}
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

      </div>
    </MainLayout>
  )
}
