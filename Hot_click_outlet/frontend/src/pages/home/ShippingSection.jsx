import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconRayo,
  IconPaquete,
  IconPin,
  IconCamion,
  IconAvion,
  IconSinpe,
  IconEfectivo,
  IconTarjeta,
} from './homeIcons'

const ENVIO_OPTS = [
  {
    Icon: IconRayo,
    title: 'Envío Rápido',
    time: '30 min – 2 horas',
    desc: 'Dentro de la GAM · Pago previo requerido',
    price: '₡5,000',
    accent: '#f59e0b',
    accentBg: 'rgba(245,158,11,0.10)',
    accentBorder: 'rgba(245,158,11,0.25)',
  },
  {
    Icon: IconPaquete,
    title: 'Envío Normal — GAM',
    time: '2–4 días hábiles',
    desc: 'Con número de rastreo incluido',
    price: '₡4,000',
    accent: 'var(--hc-accent)',
    accentBg: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
    accentBorder: 'color-mix(in srgb, var(--hc-accent) 28%, transparent)',
  },
  {
    Icon: IconPin,
    title: 'Fuera de la GAM',
    time: '3–4 días hábiles',
    desc: 'Con número de rastreo incluido',
    price: '₡4,000',
    accent: '#6366f1',
    accentBg: 'rgba(99,102,241,0.10)',
    accentBorder: 'rgba(99,102,241,0.28)',
  },
  {
    Icon: IconCamion,
    title: 'Tu encomienda',
    time: 'Según tu mensajero',
    desc: 'Te entregamos en el punto de tu preferencia',
    price: '₡2,500',
    accent: '#10b981',
    accentBg: 'rgba(16,185,129,0.09)',
    accentBorder: 'rgba(16,185,129,0.24)',
  },
  {
    Icon: IconAvion,
    title: 'Internacional',
    time: 'A coordinar',
    desc: 'Realizamos envíos fuera de Costa Rica',
    price: 'Consultar',
    accent: '#8b5cf6',
    accentBg: 'rgba(139,92,246,0.10)',
    accentBorder: 'rgba(139,92,246,0.28)',
    consultar: true,
  },
]

const HREF_WA_INTERNACIONAL = 'https://wa.me/50686667888?text=Hola%20HotClick%2C%20consulto%20un%20env%C3%ADo%20internacional.'

function EnvioInternacionalAtajo({ className }) {
  return (
    <a
      href={HREF_WA_INTERNACIONAL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar envío internacional por WhatsApp"
      className={className}
      style={{ color: 'var(--hc-muted)' }}
    >
      Consultar por WhatsApp
    </a>
  )
}

const PAGO_OPTS = [
  { label: 'SINPE Móvil', Icon: IconSinpe, color: '#10b981' },
  { label: 'Efectivo', Icon: IconEfectivo, color: '#f59e0b' },
  { label: 'Tarjeta', Icon: IconTarjeta, color: '#6490EA' },
]

export default function ShippingSection() {
  const [active, setActive] = useState(0)
  const opt = ENVIO_OPTS[active]

  return (
    <section style={{ borderTop: '1px solid var(--hc-border)', borderBottom: '1px solid var(--hc-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-2" style={{ color: 'var(--hc-accent)' }}>
              Logística HotClick
            </p>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight" style={{ color: 'var(--hc-text)', letterSpacing: '-0.02em' }}>
              Enviamos a todo el país.
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Elegí la opción que mejor se adapte a vos.</p>
          </div>
          {/* Métodos de pago */}
          <div className="flex items-center gap-2">
            {PAGO_OPTS.map(p => (
              <div
                key={p.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{
                  background: `color-mix(in srgb, ${p.color} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${p.color} 30%, transparent)`,
                  color: p.color,
                }}
              >
                <p.Icon />
                <span>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cards desktop grid + tab selector mobile */}
        <div className="hidden sm:grid grid-cols-5 gap-3">
          {ENVIO_OPTS.map((o, i) => (
            <motion.div
              key={o.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.07 }}
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--hc-surface)', border: `1px solid ${o.accentBorder}` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: o.accentBg, border: `1px solid ${o.accentBorder}`, color: o.accent }}
              >
                <o.Icon />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm leading-snug" style={{ color: 'var(--hc-text)' }}>{o.title}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: o.accent }}>{o.time}</p>
                <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--hc-muted)' }}>{o.desc}</p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: `1px solid ${o.accentBorder}` }}>
                <span className="text-sm font-black" style={{ color: o.accent }}>{o.price}</span>
                {o.consultar && (
                  <EnvioInternacionalAtajo className="text-[10px] font-medium min-h-11 inline-flex items-center" />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile: tabs + panel */}
        <div className="sm:hidden">
          {/* Tab pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {ENVIO_OPTS.map((o, i) => (
              <button type="button"
                key={o.title}
                onClick={() => setActive(i)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={active === i
                  ? { background: o.accentBg, border: `1.5px solid ${o.accentBorder}`, color: o.accent }
                  : { background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
              >
                <o.Icon />
                <span className="whitespace-nowrap">{o.title}</span>
              </button>
            ))}
          </div>

          {/* Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-4 rounded-2xl p-5 flex gap-4"
              style={{ background: 'var(--hc-surface)', border: `1px solid ${opt.accentBorder}` }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: opt.accentBg, border: `1px solid ${opt.accentBorder}`, color: opt.accent }}
              >
                <opt.Icon />
              </div>
              <div className="flex-1">
                <p className="font-bold" style={{ color: 'var(--hc-text)' }}>{opt.title}</p>
                <p className="text-sm font-semibold" style={{ color: opt.accent }}>{opt.time}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{opt.desc}</p>
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${opt.accentBorder}` }}>
                  <span className="text-lg font-black" style={{ color: opt.accent }}>{opt.price}</span>
                  {opt.consultar ? (
                    <EnvioInternacionalAtajo className="text-xs font-medium min-h-11 inline-flex items-center" />
                  ) : (
                    <Link
                      to="/productos"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg min-h-11 inline-flex items-center"
                      style={{ background: 'var(--hc-accent)', color: '#fff' }}
                    >
                      Ver catálogo
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer strip — envío rápido call to action */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ background: 'color-mix(in srgb, #f59e0b 6%, transparent)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}>
              <IconRayo />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-300">¿Necesitás algo urgente?</p>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Elegilo en datos y pago — 30 min a 2 horas en la GAM. Pago previo.</p>
            </div>
          </div>
          <Link to="/productos" className="hc-btn hc-btn-primary shrink-0 min-h-11">
            Pedir envío rápido
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
