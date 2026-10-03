import type { ReactNode } from 'react'

/** Tarjeta clara de la plantilla 28:1660: borde `hc-n-200`, radio 16, padding 16. */
export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-[10px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4 leading-[normal] ${className}`}>{children}</div>
}

/** Pasos numerados en una tarjeta de filas (número en círculo `hc-blue-50`). Derivado de Figma `28:1660`. */
export function PasosNumerados({ pasos }: { pasos: { titulo: string; detalle: string }[] }) {
  return (
    <ol className="m-0 flex list-none flex-col rounded-[16px] border border-hc-n-200 bg-hc-n-0 px-4 py-1 leading-[normal]">
      {pasos.map((p, i) => (
        <li key={p.titulo} className={`flex items-start gap-3 py-3 ${i === 0 ? '' : 'border-t border-hc-n-200'}`}>
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-[12px] font-bold text-hc-blue-600">{i + 1}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="text-[14px] font-semibold text-hc-n-900">{p.titulo}</span>
            <span className="text-[12px] leading-[17px] text-hc-n-600">{p.detalle}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Lista con viñetas de 13 px y punto `hc-n-400`. */
export function Puntos({ items }: { items: string[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
      {items.map((it) => (
        <li key={it} className="flex gap-2 text-[13px] leading-[18px] text-hc-n-600">
          <span aria-hidden="true" className="mt-[7px] size-[5px] shrink-0 rounded-full bg-hc-n-400" />
          <span className="min-w-0 flex-1">{it}</span>
        </li>
      ))}
    </ul>
  )
}

/** Etiqueta en chip de 11 px (como "Quedan 2" de la tarjeta `5:23`, en azul). */
export function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="w-fit rounded-full bg-hc-blue-50 px-2 py-[3px] text-[11px] font-semibold leading-[13px] text-hc-blue-600">{children}</span>
}

/** Nota informativa azul con ícono "i" (`.note` de la imagen aprobada `ficha-video.png`). */
export function NotaInfo({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-[10px] rounded-[12px] bg-hc-blue-50 px-[14px] py-3 text-[12px] leading-[17px] text-hc-n-600">
      <svg aria-hidden="true" viewBox="0 0 18 18" className="mt-px size-[18px] shrink-0">
        <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-hc-blue-600" />
        <path d="M9 8.2v4M9 5.6v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-hc-blue-600" />
      </svg>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}
