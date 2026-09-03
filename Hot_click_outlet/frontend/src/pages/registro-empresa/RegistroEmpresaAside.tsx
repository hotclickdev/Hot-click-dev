import { Link } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
import { motion } from 'framer-motion'
import { PERKS, STATS, stagger } from './registroEmpresaHelpers'
import {
  IconPerkPanel,
  IconPerkPagos,
  IconPerkLogistica,
  IconPerkSoporte,
} from './registroEmpresaIcons'
import type { CSSProperties, ComponentType } from 'react'

const ICONOS_PERK: Record<string, ComponentType> = {
  panel: IconPerkPanel,
  pagos: IconPerkPagos,
  logistica: IconPerkLogistica,
  soporte: IconPerkSoporte,
}

export default function RegistroEmpresaAside() {
  return (
    <div className="hidden lg:flex lg:w-[44%] relative flex-col overflow-hidden shrink-0"
      style={{ background: 'var(--hc-blue-900)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(231,59,51,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(231,59,51,0.05) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
      }} />
      <div className="absolute pointer-events-none" style={{
        top: '-10%', right: '-12%', width: '60%', height: '60%',
        background: 'radial-gradient(circle, rgba(231,59,51,0.3) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: '5%', left: '-10%', width: '50%', height: '50%',
        background: 'radial-gradient(circle, rgba(63,108,222,0.20) 0%, transparent 70%)',
        filter: 'blur(55px)',
      }} />
      <div className="absolute right-0 top-0 bottom-0 w-px" style={{
        background: 'linear-gradient(to bottom, transparent, rgba(231,59,51,0.25) 25%, rgba(231,59,51,0.25) 75%, transparent)',
      }} />

      <div className="relative z-10 flex flex-col h-full p-10">

        <motion.div {...stagger(0)} className="flex items-center gap-3 mb-12">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', '--hc-wordmark-hot': '#F0524A', '--hc-wordmark-click': '#FFFFFF' } as CSSProperties}>
            <HotClickMark size={38} gap="#152B5E" />
            <span className="hc-wordmark" style={{ fontSize: '1.25rem' }}>
              <span className="hot">Hot</span><span className="click">Click</span>
            </span>
          </Link>
        </motion.div>

        <div className="flex-1 flex flex-col justify-center">
          <motion.p {...stagger(1)} style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--hc-primary)', marginBottom: 18,
          }}>
            Para emprendedores · Costa Rica
          </motion.p>

          {['Emprendé.', 'Crecé.', 'Brillá.'].map((line, i) => (
            <motion.div key={line} {...stagger(2 + i)} style={{
              fontFamily: 'var(--hc-font-display)', fontWeight: 800,
              fontSize: 'clamp(2.4rem, 3.8vw, 3.4rem)', lineHeight: 1,
              letterSpacing: '-0.025em',
              color: i === 2 ? '#F0524A' : '#FFFFFF',
            }}>
              {line}
            </motion.div>
          ))}

          <motion.p {...stagger(5)} style={{
            color: 'var(--hc-blue-200)', fontSize: '0.9rem',
            marginTop: '1.1rem', lineHeight: 1.65, marginBottom: '2.5rem', maxWidth: 320,
          }}>
            Registrá tu negocio en HotClick y vendé a compradores en Costa Rica.
          </motion.p>

          <motion.div {...stagger(6)} className="grid grid-cols-2 gap-3 mb-10">
            {PERKS.map(({ id, title, desc }) => {
              const Icono = ICONOS_PERK[id]!
              return (
                <div key={title} style={{
                  background: 'rgba(231,59,51,0.06)',
                  border: '1px solid rgba(231,59,51,0.14)',
                  borderRadius: 14, padding: '14px 12px',
                  backdropFilter: 'blur(12px)',
                }}>
                  <div style={{ width: 22, height: 22, marginBottom: 6, color: 'var(--hc-primary)' }}>
                    <Icono />
                  </div>
                  <p style={{ fontFamily: 'var(--hc-font-display)', fontWeight: 600, fontSize: '0.78rem', color: '#FFFFFF', marginBottom: 3, lineHeight: 1.2 }}>{title}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--hc-blue-200)', lineHeight: 1.4 }}>{desc}</p>
                </div>
              )
            })}
          </motion.div>
        </div>

        <motion.div {...stagger(7)} style={{
          borderTop: '1px solid rgba(231,59,51,0.18)', paddingTop: 24, display: 'flex', gap: 36,
        }}>
          {STATS.map(({ n, s }) => (
            <div key={s}>
              <p style={{ fontFamily: 'var(--hc-font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--hc-primary)', lineHeight: 1 }}>{n}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--hc-blue-300)', marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
