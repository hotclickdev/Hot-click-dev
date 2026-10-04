import ThemeToggle from '@/components/ui/ThemeToggle'

/**
 * Modo oscuro en Opciones. En celular ya no hay lugar en la cabecera; en escritorio vive en la barra lateral.
 */
export default function FilaModoOscuro() {
  return (
    <div className="flex min-h-[52px] items-center justify-between rounded-[14px] border border-hc-border bg-hc-surface px-4 md:hidden">
      {/* TODO copy Producto */}
      <span className="text-sm font-medium text-hc-text">Modo oscuro</span>
      <ThemeToggle className="flex min-h-11 min-w-11 items-center justify-center" />
    </div>
  )
}
