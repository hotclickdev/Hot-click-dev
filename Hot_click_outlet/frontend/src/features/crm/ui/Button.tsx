// Derivado de shadcn/ui Button — MIT. Variantes con los tokens HotClick:
// primario rojo (una sola CTA roja por vista), secundario con borde n200.
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cx } from './cx'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hc-blue-100',
  {
    variants: {
      variant: {
        primary: 'bg-hc-primary text-white',
        secondary: 'border border-hc-n-200 bg-hc-surface text-hc-n-900',
        ghost: 'text-hc-blue-600',
      },
      size: { md: 'h-12 px-4', sm: 'h-9 px-3 text-xs' },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cx(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'
