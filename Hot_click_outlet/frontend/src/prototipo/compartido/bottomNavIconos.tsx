/** Íconos compartidos por los bottom nav de vendedor (Seller y Emprendedor). */

export function IconoSvgTab({ svg, active }: { svg: string; active: boolean }) {
  return (
    <span
      className={`relative block size-[22px] overflow-clip [&_svg]:size-full ${
        active ? 'text-hc-primary' : 'text-hc-muted'
      }`}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export function IconoMenuTab({ active }: { active: boolean }) {
  const color = active ? 'bg-hc-primary' : 'bg-hc-muted'
  return (
    <span className="relative block size-[22px]" aria-hidden>
      <span className={`absolute left-1/2 top-[3px] size-[8px] -translate-x-1/2 rounded-full ${color}`} />
      <span className={`absolute bottom-[3px] left-1/2 h-[7px] w-[14px] -translate-x-1/2 rounded-t-[3px] ${color}`} />
    </span>
  )
}

export function IconoReportesTab({ active }: { active: boolean }) {
  const color = active ? 'bg-hc-primary' : 'bg-hc-muted'
  return (
    <span className="relative block size-[22px] overflow-clip" aria-hidden>
      <span className={`absolute left-[3px] top-[12px] h-[7px] w-1 rounded-[1px] ${color}`} />
      <span className={`absolute left-[9px] top-[7px] h-3 w-1 rounded-[1px] ${color}`} />
      <span className={`absolute left-[15px] top-[3px] h-4 w-1 rounded-[1px] ${color}`} />
    </span>
  )
}
