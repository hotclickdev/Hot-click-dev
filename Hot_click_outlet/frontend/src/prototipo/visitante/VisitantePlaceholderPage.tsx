/**
 * Placeholder de pantallas Visitante aún no portadas del Figma.
 */
export default function VisitantePlaceholderPage({ titulo }: { titulo: string }) {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-xl font-bold">{titulo}</h1>
      <p className="mt-2 text-sm text-hc-muted">
        Pantalla contemplada en Figma (Usuario Visitante). Todavía no está maquetada en este prototipo.
      </p>
    </main>
  )
}
