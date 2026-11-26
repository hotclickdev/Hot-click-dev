import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { mensajeDeError } from './botHelpers'

export const CLAVE_BOT = ['bot'] as const

export const CONTROL = 'min-h-11 w-full rounded-[12px] border border-hc-border bg-hc-surface px-3 text-sm text-hc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--hc-blue-600)]'
export const BOTON_PRIMARIO = 'min-h-11 rounded-[12px] bg-hc-primary px-5 text-sm font-bold text-white transition-opacity disabled:opacity-50'
export const BOTON_SECUNDARIO = 'min-h-11 rounded-[12px] border border-hc-border bg-hc-surface px-4 text-sm font-semibold text-hc-text transition-colors hover:bg-[var(--hc-n-100)] disabled:opacity-50'
export const TARJETA = 'rounded-[14px] border border-hc-border bg-hc-surface p-4'

type Opciones<R> = {
  /** Clave de consulta que se invalida al terminar bien. */
  invalidar?: readonly unknown[]
  /** Texto de éxito (ya traducido); sin él no se muestra aviso. */
  exito?: string
  onExito?: (r: R) => void
}

/** Mutación con aviso de éxito o error del servidor, sin promesas sueltas (se usa con `mutate`). */
export function useAccionBot<V, R>(fn: (v: V) => Promise<R>, op: Opciones<R> = {}) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r: R) => {
      if (op.exito) toast({ message: op.exito, type: 'success' })
      if (op.invalidar) await qc.invalidateQueries({ queryKey: op.invalidar })
      op.onExito?.(r)
    },
    onError: (e: unknown) => toast({ message: mensajeDeError(e, t('bot.errorGenerico')), type: 'error' }),
  })
}

export function useConsultaBot<T>(clave: readonly unknown[], fn: () => Promise<T>, habilitado = true) {
  return useQuery({ queryKey: [...CLAVE_BOT, ...clave], queryFn: fn, enabled: habilitado })
}
