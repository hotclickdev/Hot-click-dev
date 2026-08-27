import { Link } from 'react-router-dom'

/**
 * Encabezado de pantalla admin: título o fila con volver.
 */
export default function AdminPageHeader({
  titulo,
  subtitulo,
  atras,
}: {
  titulo: string
  subtitulo?: string
  atras?: string
}) {
  if (atras) {
    return (
      <header className="mb-5 flex items-start gap-3">
        <Link to={atras} className="inline-flex min-h-8 min-w-8 items-center text-xl" aria-label="Volver">
          ←
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold leading-8">{titulo}</h1>
          {subtitulo ? <p className="text-xs text-hc-muted">{subtitulo}</p> : null}
        </div>
      </header>
    )
  }
  return (
    <header className="mb-5">
      <h1 className="font-display text-[22px] font-bold">{titulo}</h1>
      {subtitulo ? <p className="mt-0.5 text-xs text-hc-muted">{subtitulo}</p> : null}
    </header>
  )
}
