import { useState, type FormEvent } from 'react'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import Spinner from '@/components/ui/Spinner'
import { garantiaService } from '@/services/garantiaService'
import { mensajeErrorApi } from '@/utils/mensajeErrorApi'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { urlWhatsApp } from '../carrito/cartHelpers'
import { IcoEscudo } from '../perfil/cuenta/iconosCuenta'
import { IcoSrv } from './IcoSrv'
import { CLASE_CAMPO, MOTIVOS_GARANTIA, claveGarantia, descripcionGarantia, fechaDiaMes, textoVigencia, type GarantiaItem, type MotivoGarantia } from './serviciosHelpers'

type VistaGarantiaProps = {
  token: string | null
  volver: () => void
  misGarantias: GarantiaItem[] | undefined
  loadingGarantias: boolean
  onReportado?: () => void
}

function FilaProducto({ g, elegida, onElegir }: { g: GarantiaItem; elegida: boolean; onElegir: () => void }) {
  const activa = Boolean(g.activa)
  const fecha = fechaDiaMes(activa ? g.fechaEntrega : g.fechaVencimiento)
  const detalle = activa
    ? `Pedido #${g.numeroPedido} · entregado ${fechaDiaMes(g.fechaEntrega)}`
    : `Pedido #${g.numeroPedido} · venció ${fecha}`
  const estado = elegida
    ? 'border-[1.5px] border-hc-blue-600 bg-hc-blue-50'
    : `border border-hc-n-200 bg-hc-n-0 ${activa ? '' : 'opacity-60'}`
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegida}
      disabled={!activa}
      title={activa ? textoVigencia(g) : undefined}
      onClick={onElegir}
      className={`flex w-full items-center gap-3 rounded-[14px] p-[10px] text-left ${estado}`}
    >
      {g.imagenUrl
        ? <img src={g.imagenUrl} alt="" className="size-[52px] shrink-0 rounded-[10px] object-cover" loading="lazy" />
        : <span aria-hidden="true" className="size-[52px] shrink-0 rounded-[10px] bg-hc-n-100" />}
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="truncate text-[14px] font-medium text-hc-n-900">{g.nombre}</span>
        <span className="truncate text-[12px] text-hc-n-500">{detalle}</span>
      </span>
      <IcoSrv nombre={elegida ? 'radioActivo' : 'radioInactivo'} size={20} />
    </button>
  )
}

/** Formulario de garantía (Figma `28:1531`): producto, motivo, qué pasó y envío a la tienda. */
export default function VistaGarantia({ token, volver, misGarantias, loadingGarantias, onReportado }: VistaGarantiaProps) {
  const [elegida, setElegida] = useState<string | null>(null)
  const [motivo, setMotivo] = useState<MotivoGarantia | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <div className="bg-hc-n-0 max-lg:min-h-[calc(100dvh-123px)]">
        <EstadoVacio
          tono="azul"
          espaciado="cuenta"
          icono={<IcoEscudo size={28} />}
          titulo="Iniciá sesión para reportar una garantía"
          texto="Tus productos con garantía aparecen vinculados a tu cuenta."
          accion={{ texto: 'Iniciar sesión', to: rutaLoginConRetorno('/servicios?vista=garantia') }}
        />
      </div>
    )
  }

  if (loadingGarantias) return <div className="flex justify-center py-16"><Spinner /></div>

  if (!misGarantias?.length) {
    return (
      <div className="bg-hc-n-0 max-lg:min-h-[calc(100dvh-123px)]">
        <EstadoVacio
          tono="azul"
          espaciado="cuenta"
          icono={<IcoEscudo size={28} />}
          titulo="Sin garantías registradas"
          texto="Los productos comprados con garantía aparecerán aquí una vez entregados."
          accion={{ texto: 'Volver a Servicios HOT', onClick: volver }}
        />
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="bg-hc-n-0 max-lg:min-h-[calc(100dvh-123px)]">
        <EstadoVacio
          tono="azul"
          espaciado="cuenta"
          icono={<IcoEscudo size={28} />}
          titulo="Solicitud enviada"
          texto="HotClick te contactará pronto."
          accion={{ texto: 'Ver mis solicitudes', to: '/servicios?vista=solicitudes' }}
        />
      </div>
    )
  }

  const primeraActiva = misGarantias.find((g) => g.activa)
  const claveElegida = elegida ?? (primeraActiva ? claveGarantia(primeraActiva) : null)
  const producto = misGarantias.find((g) => claveGarantia(g) === claveElegida)

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!producto) { setError('Elegí el producto que tiene la falla.'); return }
    if (!texto.trim()) { setError('Describí el problema antes de enviar.'); return }
    setEnviando(true); setError('')
    try {
      await garantiaService.crearSolicitud({
        productoId: producto.productoId,
        pedidoId: producto.pedidoId,
        descripcion: descripcionGarantia(motivo, texto),
      })
      setEnviado(true)
      onReportado?.()
    } catch (err: unknown) {
      setError(mensajeErrorApi(err, 'No se pudo enviar. Intentá de nuevo.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col leading-[normal] lg:mx-auto lg:w-full lg:max-w-[560px]">
      <div className="flex flex-col gap-[18px] px-4 pb-4 pt-[18px] lg:px-0">
        <div role="radiogroup" aria-labelledby="srv-garantia-producto" className="flex flex-col gap-[6px]">
          <p id="srv-garantia-producto" className="text-[13px] font-semibold text-hc-n-900">¿Qué producto tiene la falla?</p>
          {misGarantias.map((g) => (
            <FilaProducto key={claveGarantia(g)} g={g} elegida={claveGarantia(g) === claveElegida} onElegir={() => setElegida(claveGarantia(g))} />
          ))}
        </div>

        <div role="radiogroup" aria-labelledby="srv-garantia-motivo" className="flex flex-col gap-2">
          <p id="srv-garantia-motivo" className="text-[13px] font-semibold text-hc-n-900">Motivo</p>
          <div className="flex flex-wrap items-center gap-2">
            {MOTIVOS_GARANTIA.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={motivo === m}
                onClick={() => setMotivo(motivo === m ? null : m)}
                className={`rounded-full border px-[14px] py-2 text-[13px] font-medium ${motivo === m ? 'border-hc-blue-600 bg-hc-blue-600 text-hc-n-0' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="srv-garantia-texto" className="text-[13px] font-semibold text-hc-n-900">Contanos qué pasó</label>
          <textarea
            id="srv-garantia-texto"
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Qué pasó, cuándo empezó y qué probaste"
            className={`${CLASE_CAMPO} min-h-[84px] resize-none`}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-[12px] bg-[var(--hc-danger-bg)] px-[14px] py-3 text-[13px] font-medium text-hc-danger">{error}</p>
        )}
        <p className="text-[12px] leading-4 text-hc-n-500">
          ¿Problema con un producto?{' '}
          <a href={urlWhatsApp('')} target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">
            Contactanos por WhatsApp
          </a>
        </p>
      </div>

      <div className="bg-hc-n-0 px-4 pb-6 pt-3 lg:rounded-[16px]">
        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0 disabled:opacity-50"
        >
          {enviando
            ? <><span className="size-4 animate-spin rounded-full border-2 border-hc-n-0/30 border-t-hc-n-0" />Enviando…</>
            : <><IcoSrv nombre="enviarEscudo" size={18} />Enviar a la tienda</>}
        </button>
      </div>
    </form>
  )
}
