/**
 * Pie: el texto del vendedor es extra; HotClick siempre queda como anfitrión.
 */
export default function TiendaFooter({ nombre, footerTexto }) {
  return (
    <footer className="py-6 text-center text-xs border-t border-[var(--t-border)] bg-[var(--t-surface)] text-[var(--t-muted)] space-y-1">
      {footerTexto ? <p>{footerTexto}</p> : null}
      <p>
        {nombre} — tienda en{' '}
        <span className="font-semibold text-[var(--t-text)]">HotClick</span>
      </p>
    </footer>
  )
}
