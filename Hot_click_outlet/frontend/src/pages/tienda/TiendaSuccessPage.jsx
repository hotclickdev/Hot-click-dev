import { useLocation, useParams, useSearchParams, Link } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import useTiendaStore from '@/store/tiendaStore'
import { formatPrice } from '@/utils/format'

/** Confirmación: el número vive en ?orden= y sobrevive un refresh. */
export default function TiendaSuccessPage() {
  const { slug } = useParams()
  const { state } = useLocation()
  const [params] = useSearchParams()
  const { empresa } = useTiendaStore()
  const numeroPedido = (params.get('orden') || state?.numeroPedido || '').trim()
  const total = state?.total
  const whatsapp = empresa?.whatsapp

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-5">
      <CheckCircleIcon className="mx-auto h-16 w-16 text-[var(--hc-success)]" />
      <h1 className="text-2xl font-bold text-[var(--t-text)]">Pedido recibido</h1>
      <p className="text-sm text-[var(--t-muted)]">
        Pedido de {empresa?.nombreComercial ?? slug} en HotClick
      </p>
      {numeroPedido
        ? (
          <p className="text-[var(--t-muted)]">
            Número de pedido: <span className="font-semibold text-[var(--t-text)]">{numeroPedido}</span>
          </p>
          )
        : (
          <p className="text-[var(--t-muted)]">
            Anotá el número que te llega por correo. Si recargaste esta página y no ves el número, revisá el correo de confirmación.
          </p>
          )}
      {total !== undefined && (
        <p className="text-[var(--t-muted)]">
          Total: <span className="font-bold text-[var(--t-text)]">{formatPrice(total)}</span>
        </p>
      )}
      <p className="text-sm text-[var(--t-muted)] leading-relaxed">
        Recibirás un correo de confirmación con los detalles de tu pedido.
        El vendedor se pondrá en contacto para coordinar la entrega.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Hola%2C%20acabo%20de%20hacer%20el%20pedido%20${encodeURIComponent(numeroPedido)}%20en%20su%20tienda.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold bg-[var(--hc-success)] hover:opacity-90 transition-opacity min-h-[44px]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.128.558 4.122 1.527 5.854L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.37l-.36-.213-3.755.984.998-3.648-.234-.374A9.818 9.818 0 1121.818 12 9.83 9.83 0 0112 21.818z" />
            </svg>
            Contactar por WhatsApp
          </a>
        )}
        <Link
          to={`/tienda/${slug}`}
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold border border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-hover)] transition-colors min-h-[44px]"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
