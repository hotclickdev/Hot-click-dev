import type { ReactNode } from 'react'
import { IcoEscudo } from '../perfil/cuenta/iconosCuenta'

/** Cabecera de los pasos de verificación: círculo verde de 56 px, título de 22/28 y texto de 14/20 (Figma `44:1667`). */
export function CabeceraVerificacion({ titulo, texto, icono }: { titulo: string; texto: string; icono?: ReactNode }) {
  return (
    <>
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-hc-green-50 text-hc-success">
        {icono ?? <IcoEscudo size={26} />}
      </span>
      <h1 className="font-display text-[22px] font-bold leading-[28px] text-hc-n-900">{titulo}</h1>
      <p className="text-[14px] leading-5 text-hc-n-600">{texto}</p>
    </>
  )
}

export function BotonVerificar({ cargando, textoCargando, texto, deshabilitado }: { cargando: boolean; textoCargando: string; texto: string; deshabilitado?: boolean }) {
  return (
    <button
      type="submit"
      disabled={cargando || deshabilitado}
      className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 py-[14px] text-[15px] font-semibold leading-[normal] text-hc-n-0 hover:bg-hc-red-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {cargando ? textoCargando : texto}
    </button>
  )
}

export function MensajeError({ texto }: { texto: string }) {
  if (!texto) return null
  return <p role="alert" className="text-[13px] leading-[18px] text-hc-danger">{texto}</p>
}

type OpcionProps = { icono: ReactNode; titulo: string; detalle: string; onClick: () => void; deshabilitada?: boolean }

/** Fila de "¿No tenés la app a mano?": ícono azul de 18, título de 14 semibold azul y detalle de 12 (Figma `44:1684`). */
export function OpcionAlterna({ icono, titulo, detalle, onClick, deshabilitada }: OpcionProps) {
  return (
    <button type="button" onClick={onClick} disabled={deshabilitada} className="flex w-full items-center gap-[10px] py-[10px] text-left leading-[normal] disabled:opacity-60">
      <span className="shrink-0 text-hc-blue-600">{icono}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[14px] font-semibold text-hc-blue-600">{titulo}</span>
        <span className="text-[12px] text-hc-n-500">{detalle}</span>
      </span>
    </button>
  )
}

export function TarjetaOtroMetodo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-[14px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-1">
      <p className="pt-[6px] text-[13px] font-semibold leading-[normal] text-hc-n-600">{titulo}</p>
      {children}
    </div>
  )
}
