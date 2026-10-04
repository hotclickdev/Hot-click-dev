import { Link } from 'react-router-dom'
import { RUTA_PANEL_VENDEDOR } from '@/utils/destinoVender'
import { TEXTO_REVISION } from './altaVendedorPlanes'
import { AltaTarjeta, AltaTitulo, IconoCheck } from './AltaVendedorUI'

const TAREAS = [
  { id: 'tienda', titulo: 'Completá tu tienda', desc: 'Nombre y logo de tu tienda.' },
  { id: 'bodega', titulo: 'Creá tu bodega', desc: 'Desde ahí salen tus envíos.' },
  { id: 'producto', titulo: 'Publicá tu primer producto', desc: 'Sin producto no hay venta.' },
  { id: 'cobro', titulo: 'Configurá cómo cobrás', desc: 'Tarjeta y SINPE, verificados por HotClick.' },
]

/** "¡Listo!" tras crear la cuenta (derivada de Figma 29:1932, Pago exitoso). Reemplaza el toast + modal sobre el panel. */
export default function PasoListo({ nombreNegocio }: { nombreNegocio: string }) {
  return (
    <div className="flex flex-col gap-5" data-testid="alta-listo">
      <AltaTitulo antes="¡Listo! Tu" acento="negocio" despues="está creado" sub={nombreNegocio ? `${nombreNegocio} ya tiene cuenta en HotClick.` : undefined} />
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-hc-success-bg px-3 py-1 text-[12px] font-semibold text-hc-success-text">Cuenta creada</span>
        <span className="rounded-full bg-hc-n-100 px-3 py-1 text-[12px] font-semibold text-hc-n-600">Plan Emprendedor</span>
      </div>
      <AltaTarjeta titulo="Qué sigue" sub={TEXTO_REVISION}>
        <ol className="flex flex-col gap-3">
          {TAREAS.map((t) => (
            <li key={t.id} className="flex items-start gap-2.5">
              <IconoCheck />
              <span>
                <span className="block text-[14px] font-semibold text-hc-n-900">{t.titulo}</span>
                <span className="block text-[12px] text-hc-n-600">{t.desc}</span>
              </span>
            </li>
          ))}
        </ol>
      </AltaTarjeta>
      <Link
        to={RUTA_PANEL_VENDEDOR}
        replace
        className="inline-flex h-12 items-center justify-center rounded-[12px] bg-hc-red-500 px-5 text-[15px] font-semibold text-white no-underline hover:bg-hc-red-600"
      >
        Ir a mi panel
      </Link>
    </div>
  )
}
