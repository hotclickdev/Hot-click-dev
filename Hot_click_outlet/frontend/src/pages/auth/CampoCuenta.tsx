import type { ReactNode } from 'react'

/** Campo de Figma `28:1183`: etiqueta de 13, caja de 12 con ícono de 18 y texto de 15. Lo usan ingresar y crear cuenta. */
export default function CampoCuenta({ id, etiqueta, icono, children }: { id: string; etiqueta: string; icono?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium leading-[normal] text-hc-n-600">{etiqueta}</label>
      <div className="flex w-full items-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] focus-within:border-hc-blue-600 focus-within:shadow-[inset_0_0_0_1px_var(--hc-blue-600)]">
        {icono && <span className="shrink-0 text-hc-n-600">{icono}</span>}
        {children}
      </div>
    </div>
  )
}
