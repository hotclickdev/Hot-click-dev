import { CheckIcon } from '@heroicons/react/24/outline'

/**
 * Círculo de éxito (compra / venta / plan). Figma usaba ✓ tipográfico.
 */
export default function IconoExito() {
  return (
    <div className="flex size-20 items-center justify-center rounded-full bg-[var(--hc-success-bg)]">
      <CheckIcon className="size-10 text-hc-success" aria-hidden />
    </div>
  )
}
