/**
 * Pie de la tienda (derivado de Figma: pie del comprador `25:721`, en versión mínima). El texto del
 * vendedor es extra; HotClick siempre queda como anfitrión.
 */
export default function TiendaFooter({ nombre, footerTexto }: { nombre: string; footerTexto?: string | null }) {
  return (
    <footer className="border-t border-hc-n-200 bg-hc-n-0 px-4 py-5 text-center text-[12px] leading-4 text-hc-n-600">
      {footerTexto ? <p className="mb-1">{footerTexto}</p> : null}
      <p>
        {nombre} · tienda en{' '}
        <a href="/" className="font-display font-bold text-hc-n-900">HotClick</a>
      </p>
    </footer>
  )
}
