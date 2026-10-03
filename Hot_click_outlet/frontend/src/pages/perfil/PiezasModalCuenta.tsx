import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import HojaInferior from '@/components/comprador/HojaInferior'

/**
 * Piezas de los modales de `/perfil` (contraseña y 2FA). ⚠️ COMPARTIDO: `/perfil` también lo abre un
 * emprendedor o un admin. Con `figma` (solo comprador) usan la hoja inferior y los campos del manual de
 * marca (derivado de Figma `45:1612` y `28:1110`); sin `figma` siguen con `Modal`, `Input` y `Button` tal cual.
 */
export function ContenedorModalCuenta({ figma, open, onClose, titulo, children }: {
  figma: boolean
  open: boolean
  onClose: () => void
  titulo: string
  children: ReactNode
}) {
  if (figma) return <HojaInferior abierta={open} onCerrar={onClose} titulo={titulo}>{children}</HojaInferior>
  return <Modal open={open} onClose={onClose} title={titulo} variante="clasica">{children}</Modal>
}

type CampoModalProps = InputHTMLAttributes<HTMLInputElement> & { figma: boolean; etiqueta: string }

export function CampoModalCuenta({ figma, etiqueta, className, ...resto }: CampoModalProps) {
  const id = useId()
  if (!figma) return <Input label={etiqueta} className={className} variante="clasica" {...resto} />
  return (
    <div className="flex w-full min-w-0 flex-col gap-[6px] leading-[normal]">
      <label htmlFor={id} className="text-[13px] font-semibold text-hc-n-900">{etiqueta}</label>
      <input
        id={id}
        {...resto}
        className="hc-input-libre w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500 focus:border-hc-blue-600 focus:shadow-[inset_0_0_0_1px_var(--hc-blue-600)]"
      />
    </div>
  )
}

export function ErrorModalCuenta({ figma, texto }: { figma: boolean; texto: string }) {
  if (!texto) return null
  if (figma) {
    return <p role="alert" className="rounded-[12px] bg-hc-danger-bg px-[14px] py-[10px] text-[13px] leading-[18px] text-hc-danger">{texto}</p>
  }
  return (
    <p className="text-sm rounded-lg px-3 py-2"
      style={{ color: 'var(--hc-danger)', backgroundColor: 'color-mix(in srgb, var(--hc-danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 22%, transparent)' }}>
      {texto}
    </p>
  )
}

export function TextoModalCuenta({ figma, children }: { figma: boolean; children: ReactNode }) {
  if (figma) return <p className="text-[14px] leading-5 text-hc-n-600">{children}</p>
  return <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{children}</p>
}

export function BotonModalCuenta({ figma, loading, peligro, type = 'button', onClick, children }: {
  figma: boolean
  loading?: boolean
  peligro?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
  children: ReactNode
}) {
  if (!figma) {
    return <Button type={type} loading={loading} onClick={onClick} variant={peligro ? 'danger' : undefined} variante="clasica" className="w-full">{children}</Button>
  }
  const color = peligro ? 'border border-hc-danger bg-hc-n-0 text-hc-danger' : 'bg-hc-red-500 text-hc-n-0'
  return (
    <button type={type} onClick={onClick} disabled={loading} aria-busy={loading || undefined}
      className={`flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-[14px] text-[15px] font-semibold leading-[18px] disabled:opacity-60 ${color}`}>
      {loading && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />}
      {children}
    </button>
  )
}
