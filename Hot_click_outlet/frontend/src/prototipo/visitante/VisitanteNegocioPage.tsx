import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconoEstrella, IconoMas, IconoVolver } from './VisitanteIcons'
import VisitanteMain, { VisitanteBoton, VisitanteProductCard, VisitanteSearchField } from './VisitantePiezas'
import { negocioPorId, PRODUCTOS_VISITANTE, visitanteRuta } from './visitanteMock'

/**
 * Perfil de negocio Visitante (Figma 135:288).
 */
export default function VisitanteNegocioPage() {
  const { id } = useParams()
  const negocio = negocioPorId(id)
  const [sigue, setSigue] = useState(false)
  const [consulta, setConsulta] = useState('')
  const productos = PRODUCTOS_VISITANTE.filter((item) => {
    if (item.negocioId !== negocio.id) return false
    if (!consulta.trim()) return true
    return item.nombre.toLowerCase().includes(consulta.trim().toLowerCase())
  })

  return (
    <div className="mx-auto max-w-md bg-hc-surface">
      <div className="relative h-[130px] bg-gradient-to-r from-hc-accent to-[var(--hc-blue-800)]">
        <Link
          to={visitanteRuta('recomendados')}
          aria-label="Volver"
          className="absolute left-5 top-[60px] flex size-[38px] items-center justify-center rounded-full bg-hc-surface"
        >
          <IconoVolver className="size-5" />
        </Link>
      </div>
      <div className="flex gap-3.5 px-[22px]">
        <div className="-mt-8 flex size-[72px] items-center justify-center rounded-[20px] border-4 border-white bg-hc-surface font-display text-[28px] font-bold text-hc-accent">
          {negocio.inicial}
        </div>
        <div className="pt-10">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[17px] font-bold">{negocio.nombre}</h1>
            <span className="rounded-full bg-[var(--hc-blue-50)] px-2 py-0.5 text-[8px] font-bold text-hc-accent">
              {negocio.plan}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-hc-muted">
            <IconoEstrella className="size-3 text-hc-warning" />
            {negocio.rating} · {negocio.productos} productos · {negocio.rubro}
          </p>
        </div>
      </div>
      <VisitanteMain conNav={false} className="pt-4">
        <div className="mb-5 grid grid-cols-2 gap-2.5">
          <VisitanteBoton onClick={() => setSigue((v) => !v)} className="gap-1 py-3 text-[13px]">
            {sigue ? 'Siguiendo' : (
              <>
                <IconoMas className="size-4" /> Seguir
              </>
            )}
          </VisitanteBoton>
          <VisitanteBoton to={visitanteRuta('asesor-ia')} variant="ghost" className="py-3 text-[13px]">
            Mensaje
          </VisitanteBoton>
        </div>
        <p className="mb-5 text-xs text-hc-muted">{negocio.bio}</p>
        <VisitanteSearchField placeholder="Buscar en esta tienda" value={consulta} onChange={setConsulta} />
        <h2 className="mb-3 text-[15px] font-bold">Productos</h2>
        <ul className="grid grid-cols-2 gap-3">
          {productos.map((producto) => (
            <li key={producto.id}>
              <VisitanteProductCard producto={producto} />
            </li>
          ))}
        </ul>
      </VisitanteMain>
    </div>
  )
}
