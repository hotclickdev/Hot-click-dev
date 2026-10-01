import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import Spinner from '@/components/ui/Spinner'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { IcoCaja, IcoEstrella } from '../perfil/cuenta/iconosCuenta'
import TestimonioCard from './TestimonioCard'
import type { ProductoParaResena } from './serviciosHelpers'

type VistaTestimonioProps = {
  token: string | null
  volver: () => void
  productosResenar: ProductoParaResena[] | undefined
  loadingResenar: boolean
  refetchResenar: () => void
}

function Vacio({ icono, titulo, texto, accion }: { icono: 'estrella' | 'caja'; titulo: string; texto: string; accion?: { texto: string; to?: string; onClick?: () => void } }) {
  return (
    <div className="bg-hc-n-0 max-lg:min-h-[calc(100dvh-123px)]">
      <EstadoVacio
        tono="azul"
        espaciado="cuenta"
        icono={icono === 'estrella' ? <IcoEstrella size={28} /> : <IcoCaja size={28} />}
        titulo={titulo}
        texto={texto}
        accion={accion}
      />
    </div>
  )
}

/**
 * "Contanos tu experiencia": una reseña por producto comprado. Figma solo dibuja la opción en el inicio (`28:1429`);
 * el contenido se conserva con los tokens claros del resto de Servicios HOT.
 */
export default function VistaTestimonio({ token, volver, productosResenar, loadingResenar, refetchResenar }: VistaTestimonioProps) {
  if (!token) {
    return (
      <Vacio
        icono="estrella"
        titulo="Iniciá sesión para dejar una opinión"
        texto="Solo se pueden opinar productos que hayas comprado."
        accion={{ texto: 'Iniciar sesión', to: rutaLoginConRetorno('/servicios?vista=testimonio') }}
      />
    )
  }
  if (loadingResenar) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!productosResenar?.length) {
    return (
      <Vacio
        icono="caja"
        titulo="Sin compras registradas"
        texto="Los productos de pedidos entregados aparecerán aquí para que puedas opinar."
        accion={{ texto: 'Volver a Servicios HOT', onClick: volver }}
      />
    )
  }

  const pendientes = productosResenar.filter((p) => !p.yaReseno).length
  return (
    <div className="flex flex-col leading-[normal] lg:mx-auto lg:w-full lg:max-w-[560px]">
      <section className="flex flex-col gap-[6px] bg-hc-n-0 px-4 py-5 lg:mt-6 lg:rounded-[16px]">
        <h1 className="leading-[normal] font-display text-[22px] font-bold text-hc-n-900">Contanos tu experiencia</h1>
        <p className="text-[14px] leading-5 text-hc-n-600">Una opinión por producto. Tus comentarios ayudan a otros compradores.</p>
        <p className="mt-1 rounded-[12px] bg-hc-warning-bg px-[14px] py-3 text-[12px] leading-4 text-hc-warning">
          Al dejar tu opinión, HotClick te contactará con un beneficio especial para tu próxima compra.
        </p>
      </section>
      <div className="flex flex-col gap-3 px-4 pb-6 pt-4 lg:px-0">
        {pendientes > 0 && (
          <p className="text-[13px] font-semibold text-hc-n-600">
            {pendientes} producto{pendientes === 1 ? '' : 's'} pendiente{pendientes === 1 ? '' : 's'} de opinión
          </p>
        )}
        {productosResenar.map((p, i) => (
          <TestimonioCard key={`${p.productoId}-${i}`} p={p} onEnviado={() => refetchResenar()} />
        ))}
      </div>
    </div>
  )
}
