import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'

const STEPS = [
  {
    n: '01', title: 'Explora el catálogo',
    desc: 'Ingresa a la sección de Productos y usa los filtros de categoría, condición y disponibilidad para encontrar exactamente lo que buscas. Puedes ordenar por precio o nombre.',
    icon: <SearchIcon />, color: 'text-[#4f7cff]', bg: 'bg-[#4f7cff]/10', border: 'border-[#4f7cff]/20',
  },
  {
    n: '02', title: 'Revisa los detalles',
    desc: 'Haz clic en cualquier producto para ver su descripción completa, condición, precio y disponibilidad de stock. Así te aseguras de que es lo que necesitas.',
    icon: <EyeIcon />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20',
  },
  {
    n: '03', title: 'Agrega al carrito',
    desc: 'Selecciona los productos que quieres y agrégalos al carrito. Puedes ajustar la cantidad de cada artículo directamente desde el carrito.',
    icon: <CartIcon />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
  },
  {
    n: '04', title: 'Envía tu pedido por WhatsApp',
    desc: 'Desde el carrito, presiona "Pedir por WhatsApp". Te abrirá un mensaje pre-armado con todos los productos, cantidades y el total. Solo envíalo y te atendemos de inmediato.',
    icon: <WhatsIcon />, color: 'text-[#25D366]', bg: 'bg-[#25D366]/10', border: 'border-[#25D366]/20',
  },
  {
    n: '05', title: 'Confirma y coordina el pago',
    desc: 'Nuestro equipo te confirma disponibilidad, tiempo de entrega y método de pago: SINPE Móvil, transferencia o efectivo en punto de retiro.',
    icon: <CheckIcon />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
  },
  {
    n: '06', title: 'Recibe tu producto',
    desc: 'Enviamos por Correos de Costa Rica a todo el país, o puedes coordinar retiro en punto de entrega en el GAM. Te enviamos el número de guía para que puedas rastrear tu paquete.',
    icon: <TruckIcon />, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20',
  },
]

const CONDITIONS = [
  {
    label: 'Nuevo', badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    desc: 'Producto sin uso, en su empaque original o con todos sus accesorios. Mismo estado que comprarías en una tienda convencional.',
    points: ['Empaque original intacto', 'Todos los accesorios incluidos', 'Sin marcas de uso'],
  },
  {
    label: 'Como nuevo', badge: 'bg-[#4f7cff]/15 border-[#4f7cff]/30 text-[#4f7cff]',
    desc: 'Producto que fue usado muy poco o que fue devuelto en excelente estado. Puede no tener empaque original pero funciona perfectamente.',
    points: ['Funciona al 100%', 'Marcas de uso mínimas o inexistentes', 'Puede faltar empaque o algún accesorio menor'],
  },
  {
    label: 'Usado', badge: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    desc: 'Producto con uso normal visible. Hemos verificado que funciona correctamente. Ideal si buscas precio accesible y no te importan detalles estéticos menores.',
    points: ['Totalmente funcional', 'Puede presentar rayones o marcas de uso normales', 'Precio significativamente menor'],
  },
]

const FAQS = [
  {
    q: '¿Qué opciones de envío tienen?',
    a: 'Trabajamos con dos modalidades: Correos de Costa Rica (para todo el país) y Uber Flash (entregas express en el GAM el mismo día). En ambos casos el costo del envío corre por cuenta del cliente y se coordina por WhatsApp antes de confirmar el pedido.',
  },
  {
    q: '¿Cuánto cuesta el envío por Uber Flash?',
    a: 'El costo de Uber Flash varía según la distancia entre el punto de entrega y la ubicación del producto. Te damos el estimado exacto por WhatsApp antes de confirmar. Generalmente oscila entre ₡2,000 y ₡6,000 dentro del GAM.',
  },
  {
    q: '¿Cuáles son los métodos de pago aceptados?',
    a: 'Aceptamos SINPE Móvil, transferencia bancaria y efectivo en punto de retiro. Todo se coordina directamente por WhatsApp una vez que confirmas tu pedido.',
  },
  {
    q: '¿Puedo ver el producto antes de comprarlo?',
    a: 'Sí. Puedes solicitar fotos o video del producto por WhatsApp antes de confirmar tu compra. Para clientes en el GAM también podemos coordinar que lo veas en persona. Consúltanos y con gusto te lo mostramos.',
  },
  {
    q: '¿Por cuánto tiempo se reserva un producto al contactar por WhatsApp?',
    a: 'Cuando nos contactás con interés en un producto, te damos 1 hora para tomar tu decisión de compra. Si pasada esa hora no recibimos confirmación, el producto queda disponible para otro cliente interesado. Esto nos permite atender a todos de forma justa.',
  },
  {
    q: '¿Cuántos días de garantía tienen los productos?',
    a: 'Todos nuestros productos cuentan con 40 días de garantía por fallo de funcionamiento. Si el producto deja de funcionar dentro de ese período, contáctanos por WhatsApp y buscamos la solución: reparación, cambio o reembolso según el caso.',
  },
  {
    q: '¿Cómo aplico la garantía?',
    a: 'Comunícate con nosotros por WhatsApp dentro de los 40 días de recibido el producto, describe el problema y adjunta una foto o video del fallo. Nuestro equipo te orienta en el proceso de devolución o cambio.',
  },
  {
    q: '¿Cómo sé si un producto está disponible?',
    a: 'El stock se muestra en tiempo real en el catálogo. Si aparece "En stock" o la cantidad disponible, el producto está listo para envío. Si está "Agotado", puedes contactarnos para saber cuándo regresa.',
  },
  {
    q: '¿Cómo puedo rastrear mi pedido por Correos CR?',
    a: 'Una vez despachado, te enviamos el número de guía por WhatsApp. Puedes usarlo directamente en el sitio web de Correos de Costa Rica (correoscr.com) para ver el estado de tu paquete.',
  },
]

export default function InformacionPage() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-20">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4f7cff]/10 border border-[#4f7cff]/20 text-sm text-[#4f7cff] mb-5">
            Información
          </div>
          <h1 className="text-4xl font-bold text-[#e8e8ed] mb-4">Todo lo que necesitas saber</h1>
          <p className="text-[#8e8e9a] text-lg max-w-xl mx-auto">
            Cómo comprar, qué significan las condiciones de los productos y respuestas a las preguntas más frecuentes.
          </p>
        </motion.div>

        {/* How to buy — extended */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#e8e8ed]">¿Cómo comprar?</h2>
            <p className="text-[#8e8e9a] mt-1 text-sm">Proceso paso a paso, simple y sin complicaciones</p>
          </div>
          <div className="space-y-4">
            {STEPS.map(({ n, title, desc, icon, color, bg, border }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="flex gap-5 p-5 rounded-2xl bg-[#111114] border border-white/8 hover:border-white/15 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl ${bg} border ${border} flex items-center justify-center shrink-0 ${color}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold tracking-widest ${color}`}>{n}</span>
                    <h3 className="font-semibold text-[#e8e8ed]">{title}</h3>
                  </div>
                  <p className="text-sm text-[#8e8e9a] leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/productos"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all shadow-[0_0_24px_rgba(79,124,255,0.3)]"
            >
              Ir al catálogo →
            </Link>
          </div>
        </section>

        {/* Product conditions */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#e8e8ed]">Condición de los productos</h2>
            <p className="text-[#8e8e9a] mt-1 text-sm">Todos nuestros productos son verificados antes de publicarse</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {Conditions.map(({ label, badge, desc, points }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="p-5 rounded-2xl bg-[#111114] border border-white/8 flex flex-col gap-3"
              >
                <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full border ${badge}`}>{label}</span>
                <p className="text-sm text-[#8e8e9a] leading-relaxed">{desc}</p>
                <ul className="space-y-1.5">
                  {points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-xs text-[#8e8e9a]">
                      <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Shipping options */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#e8e8ed]">Envío y entrega</h2>
            <p className="text-[#8e8e9a] mt-1 text-sm">Dos opciones para que recibas tu producto como prefieras</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">

            {/* Correos CR */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="p-6 rounded-2xl bg-[#111114] border border-white/8 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#4f7cff]/10 border border-[#4f7cff]/20 flex items-center justify-center text-[#4f7cff]">
                  <TruckIcon />
                </div>
                <div>
                  <h3 className="font-semibold text-[#e8e8ed]">Correos de Costa Rica</h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#4f7cff]/15 border border-[#4f7cff]/20 text-[#4f7cff]">Todo el país</span>
                </div>
              </div>
              <ul className="space-y-2.5">
                {[
                  'Entrega en sucursal Correos más cercana o a domicilio',
                  '1 a 5 días hábiles según la zona',
                  'Número de guía para rastreo en tiempo real',
                  'Costo según tarifa de Correos CR — lo coordina el cliente',
                ].map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-sm text-[#8e8e9a]">
                    <span className="text-[#4f7cff] mt-0.5 shrink-0">→</span>{pt}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Uber Flash */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-6 rounded-2xl bg-[#111114] border border-white/8 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <BoltIcon />
                </div>
                <div>
                  <h3 className="font-semibold text-[#e8e8ed]">Uber Flash</h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-400">Solo GAM — Express</span>
                </div>
              </div>
              <ul className="space-y-2.5">
                {[
                  'Entrega el mismo día, en horas',
                  'Disponible dentro del Gran Área Metropolitana',
                  'Costo según distancia (aprox. ₡2,000–₡6,000) — a cargo del cliente',
                  'Coordinamos el envío por WhatsApp antes de confirmar',
                ].map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-sm text-[#8e8e9a]">
                    <span className="text-amber-400 mt-0.5 shrink-0">→</span>{pt}
                  </li>
                ))}
              </ul>
              <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/15 text-xs text-amber-300 leading-relaxed">
                El costo exacto de Uber Flash se calcula al momento y te lo informamos por WhatsApp antes de que confirmes el pedido.
              </div>
            </motion.div>

          </div>
        </section>

        {/* 1-hour reservation policy */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative rounded-2xl bg-[#111114] border border-amber-500/25 p-6 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex flex-col items-center justify-center shrink-0">
              <ClockIcon />
            </div>
            <div>
              <h3 className="font-bold text-[#e8e8ed] mb-1">Política de reserva: 1 hora para decidir</h3>
              <p className="text-sm text-[#8e8e9a] leading-relaxed mb-3">
                Cuando nos contactás por WhatsApp con interés en un producto, te reservamos el artículo por <strong className="text-amber-400">1 hora</strong> para que puedas tomar tu decisión. Si pasado ese tiempo no recibimos confirmación de compra, el producto queda disponible para el siguiente cliente interesado.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 text-xs">
                <div className="flex items-start gap-2 text-[#8e8e9a]">
                  <span className="text-amber-400 mt-0.5 shrink-0">→</span>
                  Podés pedir fotos o video del producto por WhatsApp antes de confirmar
                </div>
                <div className="flex items-start gap-2 text-[#8e8e9a]">
                  <span className="text-amber-400 mt-0.5 shrink-0">→</span>
                  En el GAM podés coordinarlo para verlo en persona
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Warranty & returns */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#e8e8ed]">Garantía y devoluciones</h2>
            <p className="text-[#8e8e9a] mt-1 text-sm">Tu compra está protegida — todos los productos tienen garantía</p>
          </div>

          {/* 40-day warranty banner */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="relative rounded-2xl bg-[#111114] border border-emerald-500/25 p-6 mb-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex flex-col items-center justify-center shrink-0">
                <span className="text-2xl font-extrabold text-emerald-400 leading-none">40</span>
                <span className="text-[9px] font-semibold text-emerald-400/70 uppercase tracking-widest leading-none mt-0.5">días</span>
              </div>
              <div>
                <h3 className="font-bold text-[#e8e8ed] text-lg mb-1">Garantía de 40 días en todos los productos</h3>
                <p className="text-sm text-[#8e8e9a] leading-relaxed">
                  Todos nuestros productos tienen garantía de funcionamiento por <strong className="text-emerald-400">40 días</strong> desde la fecha de recibido. Si el producto falla o deja de funcionar en ese período, lo resolvemos sin complicaciones.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Return process steps */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                step: '1', title: 'Contáctanos por WhatsApp',
                desc: 'Escríbenos dentro de los 40 días de recibido el producto. Describe el problema con detalle.',
                color: 'text-[#4f7cff]', bg: 'bg-[#4f7cff]/10', border: 'border-[#4f7cff]/20',
              },
              {
                step: '2', title: 'Documenta el fallo',
                desc: 'Adjunta fotos o un video corto mostrando el problema. Esto nos ayuda a evaluar el caso más rápido.',
                color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
              },
              {
                step: '3', title: 'Resolvemos juntos',
                desc: 'Según el caso: coordinamos devolución, cambio de producto o reembolso. Siempre buscamos la mejor solución.',
                color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
              },
            ].map(({ step, title, desc, color, bg, border }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="p-5 rounded-2xl bg-[#111114] border border-white/8 flex flex-col gap-3"
              >
                <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center ${color} font-bold text-sm shrink-0`}>
                  {step}
                </div>
                <h3 className="font-semibold text-[#e8e8ed] text-sm">{title}</h3>
                <p className="text-xs text-[#8e8e9a] leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-4 p-4 rounded-xl bg-white/4 border border-white/8 text-xs text-[#8e8e9a] leading-relaxed"
          >
            <strong className="text-[#e8e8ed]">Nota:</strong> La garantía cubre fallos de funcionamiento. No aplica para daños causados por mal uso, caídas, líquidos o modificaciones del producto. Los costos de envío en caso de devolución se coordinan caso a caso.
          </motion.div>
        </section>

        {/* FAQ */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#e8e8ed]">Preguntas frecuentes</h2>
            <p className="text-[#8e8e9a] mt-1 text-sm">Todo lo que suelen preguntarnos</p>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-medium text-[#e8e8ed] text-sm">{faq.q}</span>
                  <ChevronIcon open={openFaq === i} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm text-[#8e8e9a] leading-relaxed border-t border-white/6 pt-3">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="relative rounded-3xl bg-[#111114] border border-white/8 p-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4f7cff]/8 to-purple-500/5 pointer-events-none" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-[#e8e8ed] mb-3">¿Tienes más dudas?</h2>
              <p className="text-[#8e8e9a] mb-6 max-w-sm mx-auto text-sm">Escríbenos directamente por WhatsApp y te respondemos al instante.</p>
              <a
                href="https://wa.me/50689745370"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#1da851] text-white font-semibold text-sm transition-all shadow-[0_0_24px_rgba(37,211,102,0.25)]"
              >
                <WhatsIconSm /> Contactar por WhatsApp
              </a>
            </div>
          </div>
        </section>

      </div>
    </MainLayout>
  )
}

// Re-use CONDITIONS array with fixed variable name
const Conditions = CONDITIONS

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-[#8e8e9a] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

const sv = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
function SearchIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function EyeIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function CartIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg> }
function WhatsIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> }
function CheckIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
function TruckIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> }
function BoltIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
function ClockIcon() { return <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg> }
function WhatsIconSm() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> }
