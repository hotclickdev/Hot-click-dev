import { Link } from 'react-router-dom'
import { TEXTOS_MULTINEGOCIO as T } from './multinegocioTextos'

/** S2 · Multinegocio, estado 403 (lámina multinegocio-390-crear-vacio-403). */
export default function SinAccesoNegocioPage({ rutaMisNegocios = '/login' }: { rutaMisNegocios?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-display text-[20px] font-bold text-hc-text">{T.sinAccesoTitulo}</h1>
      <p className="max-w-sm text-[14px] text-hc-muted">{T.sinAccesoCuerpo}</p>
      <Link to={rutaMisNegocios} className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-hc-primary px-5 text-[15px] font-bold text-white">
        {T.sinAccesoCta}
      </Link>
    </main>
  )
}
