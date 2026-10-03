import type { ReactNode } from 'react'
import { AltaHeader } from '@/pages/registro-empresa/AltaVendedorUI'

/** Chrome de `/registrar-negocio` (comprador que pasa a vendedor): mismo header y fondo n50 que el alta (Figma 30:2385). */
export default function RegistrarNegocioLayout({ onSkip, children }: { onSkip: () => void; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-hc-n-50 font-[family-name:var(--hc-font-text)] text-hc-n-900">
      <AltaHeader
        derecha={<button type="button" onClick={onSkip} className="text-[13px] font-semibold text-hc-blue-600">Hacer esto después</button>}
      />
      <main className="mx-auto w-full max-w-[640px] px-4 pb-12 pt-5 lg:pt-8">{children}</main>
    </div>
  )
}
