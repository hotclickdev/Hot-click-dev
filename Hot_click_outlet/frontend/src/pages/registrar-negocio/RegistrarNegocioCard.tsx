import type { ReactNode } from 'react'

/** Tarjeta clara del formulario (radio 14, borde n200, sin degradado ni sombra). */
export default function RegistrarNegocioCard({ children }: { children: ReactNode }) {
  return <div className="rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4 lg:p-5">{children}</div>
}
