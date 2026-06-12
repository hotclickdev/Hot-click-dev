import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const TOUR_KEY = 'hc-admin-tour-v3-done'

const STEPS = [
  {
    type: 'welcome',
    emoji: '🛒',
    title: '¡Bienvenido al Panel HotClick!',
    desc: 'Este tour te lleva por cada sección del panel para que aprendas a gestionar tu negocio paso a paso. Solo toma un par de minutos.',
    color: 'var(--hc-accent)',
  },
  {
    path: '/admin',
    emoji: '🏠',
    title: 'Dashboard',
    subtitle: 'Tu centro de control diario',
    desc: 'La primera pantalla que verás al entrar. Muestra el estado de tu negocio en tiempo real para tomar decisiones rápidas.',
    features: [
      '📊 KPIs de ventas: ingresos hoy, esta semana y este mes',
      '📦 Pedidos recientes con su estado actual',
      '📈 Gráfica de ventas de los últimos 7 días',
      '👥 Últimos clientes registrados en la plataforma',
    ],
    tip: 'Empezá aquí cada día para ver el panorama completo antes de atender clientes.',
    color: 'var(--hc-accent)',
  },
  {
    path: '/admin/productos',
    emoji: '📦',
    title: 'Catálogo de Productos',
    subtitle: 'Tu inventario digital completo',
    desc: 'Desde acá creás y gestionás todo lo que vendés: fotos, precios, stock, categorías y más.',
    features: [
      '➕ Crear productos con fotos, precio y descripción detallada',
      '📸 Generar fichas de producto automáticamente con IA desde una foto',
      '🏷️ Clasificar por categorías, marcas y etiquetas',
      '🔢 Control de stock con alertas de inventario bajo',
      '⭐ Destacar productos para que aparezcan en el homepage',
    ],
    tip: 'Usá "Crear con IA" — sacás una foto y la IA rellena título, descripción y precio sugerido.',
    color: 'var(--hc-accent)',
  },
  {
    path: '/admin/pedidos',
    emoji: '📋',
    title: 'Pedidos',
    subtitle: 'Gestión de órdenes online',
    desc: 'Acá aterrizan todas las compras que hacen tus clientes desde la tienda online. Podés gestionar cada pedido de principio a fin.',
    features: [
      '🔄 Avanzar estados: Pendiente → Pagado → Enviado → Entregado',
      '📬 Asignar número de guía de Correos de Costa Rica',
      '📧 Notificar al cliente por email con un solo click',
      '💬 Generar mensaje de WhatsApp listo para enviar',
    ],
    tip: 'El botón WhatsApp genera un mensaje completo con productos, estado y guía — solo abrís el chat.',
    color: '#34d399',
  },
  {
    path: '/admin/pos',
    emoji: '🖥️',
    title: 'Caja POS',
    subtitle: 'Ventas presenciales y ferias',
    desc: 'Punto de venta para cobrar cara a cara en tu tienda, feria o evento. No necesitás internet para funcionar.',
    features: [
      '🛍️ Buscador ultra rápido para agregar productos al carrito',
      '💵 Aceptar efectivo, SINPE Móvil y tarjeta débito/crédito',
      '🖨️ Enviar recibo por WhatsApp o imprimir en térmica',
      '📊 Cuadre de caja al final de cada turno',
      '🪑 Modo mesas: ideal para restaurantes y cafeterías',
    ],
    tip: 'Activá el modo offline antes de ir a una feria — podés cobrar sin señal y sincroniza al volver.',
    color: '#f59e0b',
  },
  {
    path: '/admin/finanzas',
    emoji: '💰',
    title: 'Finanzas',
    subtitle: 'Ingresos reales de tu negocio',
    desc: 'Resumen financiero claro: cuánto entraste, cuánto costaron los envíos y el desglose por cada pedido entregado.',
    features: [
      '💵 Ingresos totales por productos (solo pedidos ENTREGADOS)',
      '🚚 Costos de envío desglosados: moto vs Correos CR',
      '📅 Filtros por período: hoy, 7 días, 30 días o rango manual',
      '📊 Tabla con desglose detallado y totales por pedido',
    ],
    tip: 'Solo se muestran pedidos ENTREGADOS — siempre ves dinero real, no promesas de pago.',
    color: '#4ade80',
  },
  {
    path: '/admin/ofertas',
    emoji: '📣',
    title: 'Marketing',
    subtitle: 'Atraé y retené clientes',
    desc: 'Herramientas para promocionar tu negocio: ofertas automáticas, cupones, publicaciones en redes y blog.',
    features: [
      '🔥 Crear ofertas con descuento por porcentaje o monto fijo',
      '🎟️ Generar códigos de cupón para clientes especiales',
      '📘 Publicar posts directamente en tu página de Facebook',
      '📝 Blog: artículos y noticias para posicionar tu marca',
      '🤝 Aparecer en el directorio de emprendimientos',
    ],
    tip: 'Los cupones se aplican automáticamente en el checkout — sin pasos extra para el cliente.',
    color: '#E5A93D',
  },
  {
    path: '/admin/copilot',
    emoji: '🤖',
    title: 'Inteligencia Artificial',
    subtitle: 'Decisiones más inteligentes',
    desc: 'Cuatro herramientas de IA para entender tu negocio, prevenir quiebres de stock y proyectar el futuro.',
    features: [
      '💬 AI Copilot: hacé preguntas en español y recibís análisis instantáneo',
      '📊 AI Inventario: detecta automáticamente qué productos se van a agotar',
      '📈 AI Forecast: proyecciones de demanda para planificar compras',
      '🏆 Executive BI: dashboard gerencial con insights y alertas',
    ],
    tip: 'Probá preguntarle al Copilot: "¿Cuál es mi producto más rentable este mes?"',
    color: 'var(--hc-blue-300)',
  },
  {
    path: '/admin/mi-empresa',
    emoji: '🏢',
    title: 'Mi Negocio',
    subtitle: 'Perfil y configuración de tu empresa',
    desc: 'Completá el perfil de tu negocio, invitá a tu equipo, personalizá el branding y revisá tu suscripción.',
    features: [
      '🏢 Nombre, logo, descripción y datos de contacto',
      '👥 Invitar colaboradores: cajero, gerente, supervisor',
      '🎨 Personalizar colores, logo y modo white label',
      '🔌 Conectar plugins e integraciones externas',
      '💎 Ver tu plan actual, uso y límites',
    ],
    tip: 'Un perfil completo te hace aparecer en el directorio público de emprendimientos de HotClick.',
    color: '#6490EA',
  },
  {
    type: 'done',
    emoji: '🎉',
    title: '¡Tour completado!',
    desc: 'Ya conocés las secciones principales del panel. Podés volver a ver este tour cuando quieras desde el botón de ayuda en el menú.',
    color: 'var(--hc-accent)',
  },
]

const TOTAL = STEPS.length

// Sidebar spotlight CSS — se inyecta solo cuando el tour está activo
const TOUR_CSS = `
  .hc-tour-active .hc-admin-sidebar a[aria-current="page"] {
    animation: hc-tour-glow 2s ease-in-out infinite !important;
  }
  @keyframes hc-tour-glow {
    0%, 100% { box-shadow: 0 0 0 2px rgba(23,71,168,.55), 0 0 18px rgba(23,71,168,.25); }
    50%       { box-shadow: 0 0 0 3px rgba(23,71,168,.4),  0 0 32px rgba(23,71,168,.45); }
  }
`

function useTourState() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setShow(true), 1800)
      return () => clearTimeout(t)
    }
  }, [])
  return [show, setShow]
}

export default function AppTour() {
  const [show, setShow] = useTourState()
  const [step, setStep] = useState(0)
  const navigate = useNavigate()

  // Inject spotlight CSS once
  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = TOUR_CSS
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  // Sidebar spotlight class
  useEffect(() => {
    document.body.classList.toggle('hc-tour-active', show)
    return () => document.body.classList.remove('hc-tour-active')
  }, [show])

  // Manual trigger via window event
  useEffect(() => {
    const handler = () => { setStep(0); setShow(true) }
    window.addEventListener('hc-open-tour', handler)
    return () => window.removeEventListener('hc-open-tour', handler)
  }, [setShow])

  const dismiss = useCallback(() => {
    localStorage.setItem(TOUR_KEY, '1')
    setShow(false)
  }, [setShow])

  const go = useCallback((next) => {
    if (next < 0 || next >= TOTAL) { dismiss(); return }
    const s = STEPS[next]
    if (s.path) navigate(s.path)
    setStep(next)
  }, [navigate, dismiss])

  const current = STEPS[step]
  const isSpecial = current.type === 'welcome' || current.type === 'done'
  const isFirst   = step === 0
  const isLast    = step === TOTAL - 1

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isSpecial ? dismiss : undefined}
            className="fixed inset-0 z-[90]"
            style={{
              backgroundColor: isSpecial ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.18)',
              backdropFilter: isSpecial ? 'blur(6px)' : 'none',
              pointerEvents: isSpecial ? 'auto' : 'none',
            }}
          />

          {/* ── Card ── */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className={`fixed z-[100] ${
              isSpecial
                ? 'inset-0 flex items-center justify-center p-4 pointer-events-none'
                : 'bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 md:bottom-6'
            }`}
          >
            <div
              className="pointer-events-auto rounded-2xl overflow-hidden"
              style={{
                width: isSpecial ? 'min(480px, 100%)' : 'calc(100vw - 2rem)',
                maxWidth: isSpecial ? undefined : '27rem',
                backgroundColor: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                boxShadow: '0 28px 72px rgba(0,0,0,0.55), 0 4px 20px rgba(0,0,0,0.25)',
              }}
            >
              {/* Accent stripe */}
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${current.color}, ${current.color}99)` }} />

              <div className="p-5 space-y-4">

                {/* ── Header ── */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 select-none"
                    style={{ backgroundColor: `${current.color}1a` }}
                  >
                    {current.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold leading-snug" style={{ color: 'var(--hc-text)' }}>
                      {current.title}
                    </h3>
                    {current.subtitle && (
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: current.color }}>
                        {current.subtitle}
                      </p>
                    )}
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                      {current.desc}
                    </p>
                  </div>
                  <button
                    onClick={dismiss}
                    aria-label="Cerrar tour"
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                    style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                {/* ── Feature list ── */}
                {current.features && (
                  <div className="space-y-1.5 pl-1">
                    {current.features.map((f, i) => (
                      <div key={i} className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                        {f}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Pro tip ── */}
                {current.tip && (
                  <div
                    className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
                    style={{ backgroundColor: `${current.color}0f`, border: `1px solid ${current.color}28` }}
                  >
                    <span className="shrink-0 text-sm leading-relaxed">💡</span>
                    <p style={{ color: 'var(--hc-muted)' }}>
                      <strong style={{ color: current.color }}>Pro tip: </strong>
                      {current.tip}
                    </p>
                  </div>
                )}

                {/* ── Footer ── */}
                <div>
                  {/* Progress dots */}
                  <div className="flex items-center gap-1 mb-3">
                    {STEPS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => go(i)}
                        aria-label={`Paso ${i + 1}`}
                        className="rounded-full transition-all duration-200 shrink-0"
                        style={{
                          width: i === step ? 16 : 5,
                          height: 5,
                          backgroundColor: i === step ? current.color : 'var(--hc-border)',
                        }}
                      />
                    ))}
                    <span className="ml-auto text-[10px] font-medium shrink-0" style={{ color: 'var(--hc-muted)' }}>
                      {step + 1} / {TOTAL}
                    </span>
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex gap-2">
                    {isFirst ? (
                      <button
                        onClick={dismiss}
                        className="flex-1 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                        style={{ minHeight: 44, backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
                      >
                        Omitir
                      </button>
                    ) : (
                      <button
                        onClick={() => go(step - 1)}
                        className="flex-1 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                        style={{ minHeight: 44, backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
                      >
                        ← Anterior
                      </button>
                    )}
                    <button
                      onClick={() => go(step + 1)}
                      className="rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] hover:opacity-90"
                      style={{ minHeight: 44, flex: 2, backgroundColor: current.color }}
                    >
                      {isLast ? '¡Listo! 🎉' : 'Siguiente →'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
