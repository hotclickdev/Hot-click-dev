// Derivado de shadcn/ui Badge — MIT. Tonos con los tokens HotClick (chips pill).
import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cx } from './cx'

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    tono: {
      neutro: 'bg-hc-n-100 text-hc-n-600',
      ok: 'bg-hc-success-bg text-hc-success-text',
      alerta: 'bg-hc-danger-bg text-hc-primary-text',
      azul: 'bg-hc-blue-50 text-hc-blue-600',
    },
  },
  defaultVariants: { tono: 'neutro' },
})

export function Badge({ className, tono, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cx(badgeVariants({ tono }), className)} {...props} />
}
