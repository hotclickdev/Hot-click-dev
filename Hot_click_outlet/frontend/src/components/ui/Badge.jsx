const variants = {
  default: 'bg-white/8 text-[#e8e8ed] border border-white/10',
  accent: 'bg-[#4f7cff]/15 text-[#4f7cff] border border-[#4f7cff]/20',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  danger: 'bg-red-500/15 text-red-400 border border-red-500/20',
  purple: 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)] border border-[var(--hc-blue-500)]/20',
}

export default function Badge({ variant = 'default', className = '', children }) {
  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
      ${variants[variant]} ${className}
    `}>
      {children}
    </span>
  )
}
