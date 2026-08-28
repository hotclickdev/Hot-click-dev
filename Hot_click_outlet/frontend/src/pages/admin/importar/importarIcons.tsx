import type { SVGProps } from 'react'

const s: SVGProps<SVGSVGElement> = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function IconGlobe()   { return <svg viewBox="0 0 24 24" className="w-5 h-5" {...s}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/></svg> }
export function IconPdf()     { return <svg viewBox="0 0 24 24" className="w-5 h-5" {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> }
export function IconCsv()     { return <svg viewBox="0 0 24 24" className="w-5 h-5" {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg> }
export function IconCheck()   { return <svg viewBox="0 0 24 24" className="w-4 h-4" {...s}><polyline points="20 6 9 17 4 12"/></svg> }
export function IconWarn()    { return <svg viewBox="0 0 24 24" className="w-4 h-4" {...s}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
export function IconUpload()  { return <svg viewBox="0 0 24 24" className="w-6 h-6" {...s}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }
export function IconSpinner() { return <svg viewBox="0 0 24 24" className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" strokeOpacity={0.2}/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg> }
export function IconArrow()   { return <svg viewBox="0 0 24 24" className="w-4 h-4" {...s}><path d="M19 12H5M12 5l-7 7 7 7"/></svg> }
export function IconImg()     { return <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }
export function IconEye()     { return <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" {...s}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
export function IconApply()   { return <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" {...s}><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> }
export function IconChevron() { return <svg viewBox="0 0 24 24" className="w-4 h-4" {...s}><polyline points="6 9 12 15 18 9"/></svg> }
