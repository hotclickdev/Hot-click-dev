import { Link } from 'react-router-dom'

/**
 * @param {{
 *   links: { to: string, label: string, icon: import('react').ReactNode, highlight?: boolean }[]
 * }} props
 */
export default function QuickLinks({ links }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider mb-3">
        Acceso rápido
      </h2>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {links.map((link) => (
          link.highlight ? (
            <Link
              key={link.to}
              to={link.to}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all text-center group col-span-1"
              style={{ background: 'linear-gradient(135deg,rgba(23,71,168,0.18),rgba(23,71,168,0.18))', border: '1.5px solid rgba(23,71,168,0.4)' }}
            >
              <span className="w-5 h-5" style={{ color: '#7aa3ff' }}>{link.icon}</span>
              <span className="text-xs font-bold leading-tight" style={{ color: '#7aa3ff' }}>
                {link.label}
              </span>
            </Link>
          ) : (
            <Link
              key={link.to}
              to={link.to}
              className="flex flex-col items-center gap-2 p-4 bg-[#111114] border border-white/8 rounded-2xl hover:border-white/15 hover:bg-[#1a1a1f] transition-all text-center group"
            >
              <span className="w-5 h-5 text-[#8e8e9a] group-hover:text-white transition-colors">
                {link.icon}
              </span>
              <span className="text-xs text-[#8e8e9a] group-hover:text-white transition-colors leading-tight">
                {link.label}
              </span>
            </Link>
          )
        ))}
      </div>
    </div>
  )
}
