import type { SVGProps } from 'react'

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-[#8e8e9a] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

const sv: SVGProps<SVGSVGElement> = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
export function SearchIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
export function EyeIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
export function CartIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg> }
export function PayIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> }
export function CheckIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
export function TruckIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> }
export function BoltIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" {...sv}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
export function ClockIcon() { return <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg> }
