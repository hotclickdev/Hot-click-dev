import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const TOUR_KEY = 'hc-admin-tour-v2-done'

/* ── Pasos ──────────────────────────────────────────────────────────── */
const STEPS = [
  {
    emoji: '⚡',
    title: '¡Bienvenido al panel HOTCLICK!',
    desc: 'Este tour te muestra todas las secciones disponibles. Navegá con los botones o los puntos de abajo.',
    color: '#7840e0',
    items: null,
  },
  {
    emoji: '📦',
    title: 'Catálogo',
    desc: 'Inventario, proveedores y logística.',
    color: '#4f7cff',
    items: [
      { icon: '🛍️', label: 'Productos',    hint: 'Crear y editar catálogo' },
      { icon: '🏷️', label: 'Categorías',   hint: 'Árbol de categorías' },
      { icon: '🏭', label: 'Marcas',        hint: 'Logos y marcas' },
      { icon: '🏗️', label: 'Bodegas',       hint: 'Control de almacenes' },
      { icon: '🛡️', label: 'Garantías',     hint: 'Garantías de productos' },
      { icon: '🛒', label: 'Compras',       hint: 'Órdenes de compra' },
      { icon: '🤝', label: 'Proveedores',   hint: 'Directorio de proveedores' },
    ],
  },
  {
    emoji: '💸',
    title: 'Ventas',
    desc: 'Canales de venta online, presencial y express.',
    color: '#34d399',
    items: [
      { icon: '📋', label: 'Pedidos',       hint: 'Órdenes online y estado' },
      { icon: '⚡', label: 'Nueva Venta',   hint: 'Venta manual rápida' },
      { icon: '🖥️', label: 'Caja POS',      hint: 'Punto de venta presencial' },
      { icon: '🪑', label: 'Mesas / QR',    hint: 'Autoservicio por mesa' },
      { icon: '🎁', label: 'Gift Cards',    hint: 'Tarjetas de regalo' },
    ],
  },
  {
    emoji: '🤖',
    title: 'Inteligencia Artificial',
    desc: 'Herramientas IA para potenciar tu negocio.',
    color: '#a78bfa',
    items: [
      { icon: '📊', label: 'AI Inventario',  hint: 'Predicción de stock' },
      { icon: '💬', label: 'AI Copilot',     hint: 'Asistente de análisis' },
      { icon: '📈', label: 'AI Forecast',    hint: 'Proyecciones de ventas' },
      { icon: '🏆', label: 'Executive BI',   hint: 'Dashboard ejecutivo' },
    ],
  },
  {
    emoji: '💰',
    title: 'Finanzas & Reportes',
    desc: 'Ingresos, egresos y métricas del negocio.',
    color: '#4ade80',
    items: [
      { icon: '💵', label: 'Finanzas',      hint: 'Ingresos, egresos y flujo de caja' },
      { icon: '📉', label: 'Reportes',      hint: 'Reportes detallados y exportables' },
    ],
  },
  {
    emoji: '📣',
    title: 'Marketing',
    desc: 'Herramientas para atraer y retener clientes.',
    color: '#fb923c',
    items: [
      { icon: '🔥', label: 'Ofertas',         hint: 'Descuentos y precios especiales' },
      { icon: '✨', label: 'Gen. producto',   hint: 'Crear producto rápido con IA' },
      { icon: '📘', label: 'Publicar FB',     hint: 'Post directo a Facebook' },
      { icon: '📝', label: 'Blog',            hint: 'Publicaciones y artículos' },
      { icon: '🚀', label: 'Emprendimientos', hint: 'Marketplace de negocios' },
      { icon: '⚙️', label: 'Servicios HOT',   hint: 'Catálogo de servicios' },
      { icon: '💬', label: 'Testimonios',     hint: 'Reseñas de clientes' },
    ],
  },
  {
    emoji: '🖥️',
    title: 'Sistema & Configuración',
    desc: 'Personalización, integraciones y plataforma.',
    color: '#60a5fa',
    items: [
      { icon: '🎠', label: 'Homepage',       hint: 'Carrusel y diseño del inicio' },
      { icon: '🎨', label: 'Branding',       hint: 'Logo, colores, white label' },
      { icon: '🌎', label: 'LATAM Multi-país', hint: 'Operación en varios países' },
      { icon: '🔌', label: 'Plugins',        hint: 'Integraciones externas' },
      { icon: '🔑', label: 'API Keys',       hint: 'Claves para desarrolladores' },
      { icon: '💳', label: 'Pagos',          hint: 'Pasarelas y webhooks' },
    ],
  },
  {
    emoji: '👥',
    title: 'Administración',
    desc: 'Usuarios, seguridad, fiscal y cumplimiento.',
    color: '#f87171',
    items: [
      { icon: '👤', label: 'Usuarios',       hint: 'Cuentas y roles' },
      { icon: '🏢', label: 'Empresas',       hint: 'Multi-tenant' },
      { icon: '✅', label: 'Aprobaciones',   hint: 'Nuevos negocios' },
      { icon: '🔒', label: 'Security',       hint: 'Logs y auditoría' },
      { icon: '📡', label: 'Observabilidad', hint: 'Métricas del sistema' },
      { icon: '🧾', label: 'Comprobantes',   hint: 'Facturas electrónicas' },
      { icon: '📑', label: 'Config. Fiscal', hint: 'Parámetros tributarios' },
      { icon: '🏷️', label: 'Feature Flags',  hint: 'Funciones SaaS' },
      { icon: '🤖', label: 'Control IA',     hint: 'Permisos de IA' },
      { icon: '💎', label: 'Planes',         hint: 'Suscripciones y cobros' },
      { icon: '⚙️', label: 'Configuración',  hint: 'Ajustes generales' },
    ],
  },
]

function useFirstVisit() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const timer = setTimeout(() => setShow(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])
  return [show, setShow]
}

export default function AppTour() {
  const [show, setShow] = useFirstVisit()
  const [step, setStep] = useState(0)
  const listRef = useRef(null)

  // Scroll del listado al inicio cuando cambia el paso
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [step])

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, '1')
    setShow(false)
  }

  const go = (next) => {
    if (next < 0 || next >= STEPS.length) { dismiss(); return }
    setStep(next)
  }

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Fondo tenue solo en el paso de bienvenida */}
          {step === 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] pointer-events-none"
              style={{ backgroundColor: 'rgba(0,0,0,0.28)' }}
            />
          )}

          {/* ── Card principal ── */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 32, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            /* Posición: bottom-4 en móvil, bottom-6 en desktop
               Ancho: casi todo el viewport en móvil, máx 424px en desktop */
            className="fixed z-[100] bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 md:bottom-6 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: 'calc(100vw - 2rem)',
              maxWidth: '26.5rem',
              backgroundColor: 'var(--hc-surface)',
              border: '1px solid var(--hc-border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            {/* Franja color */}
            <div className="h-1 w-full shrink-0" style={{ backgroundColor: current.color }} />

            {/* Cuerpo con scroll interno cuando hay muchos ítems */}
            <div className="flex flex-col" style={{ maxHeight: 'min(82vh, 520px)' }}>

              {/* Encabezado — fijo, no hace scroll */}
              <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: `${current.color}1a` }}
                  >
                    {current.emoji}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--hc-text)' }}>
                      {current.title}
                    </h3>
                    <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                      {current.desc}
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
                  style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
                  aria-label="Cerrar guía"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Lista de ítems — scrollable verticalmente */}
              {current.items && current.items.length > 0 && (
                <div
                  ref={listRef}
                  className="overflow-y-auto px-4 pb-1"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: `${current.color}40 transparent` }}
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {current.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-start gap-2 rounded-xl px-2.5 py-2"
                        style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
                      >
                        <span className="text-base leading-none mt-0.5 shrink-0" aria-hidden="true">
                          {item.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--hc-text)' }}>
                            {item.label}
                          </p>
                          <p
                            className="text-[11px] leading-snug mt-0.5"
                            style={{ color: 'var(--hc-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {item.hint}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer — fijo abajo */}
              <div className="px-4 pt-3 pb-4 shrink-0">
                {/* Puntos de progreso */}
                <div className="flex items-center gap-1 mb-3">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className="rounded-full transition-all"
                      style={{
                        width: i === step ? 18 : 5,
                        height: 5,
                        backgroundColor: i === step ? current.color : 'var(--hc-border)',
                        flexShrink: 0,
                      }}
                      aria-label={`Paso ${i + 1}`}
                    />
                  ))}
                  <span className="ml-auto text-[10px] font-medium shrink-0" style={{ color: 'var(--hc-muted)' }}>
                    {step + 1} / {STEPS.length}
                  </span>
                </div>

                {/* Botones navegación — touch-friendly (min 44px) */}
                <div className="flex gap-2">
                  {step > 0 ? (
                    <button
                      onClick={() => go(step - 1)}
                      className="flex-1 rounded-xl text-sm font-medium transition-colors"
                      style={{
                        minHeight: 44,
                        backgroundColor: 'var(--hc-surface-2)',
                        color: 'var(--hc-muted)',
                      }}
                    >
                      ← Anterior
                    </button>
                  ) : (
                    <button
                      onClick={dismiss}
                      className="flex-1 rounded-xl text-sm font-medium transition-colors"
                      style={{
                        minHeight: 44,
                        backgroundColor: 'var(--hc-surface-2)',
                        color: 'var(--hc-muted)',
                      }}
                    >
                      Omitir
                    </button>
                  )}
                  <button
                    onClick={() => go(step + 1)}
                    className="flex-1 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                    style={{
                      minHeight: 44,
                      backgroundColor: current.color,
                    }}
                  >
                    {isLast ? '¡Listo! 🎉' : 'Siguiente →'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
