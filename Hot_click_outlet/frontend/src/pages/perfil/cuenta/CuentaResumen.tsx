import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { estadoDePedido } from '../../pedidos/pedidoHelpers'
import ChipEstadoPedido from '../../pedidos/ChipEstadoPedido'
import type { PedidoCliente } from '../../pedidos/pedidoHelpers'
import {
  etiquetaPedido, estadoGlobal, fechaCorta, haceCuanto, iniciales, miniaturasDePedido, primerNombre,
  productosPendientesDeOpinar, resumenDePedidos, solicitudesCotizadas, solicitudesEnBusqueda,
  type EventoActividad, type ProductoPorOpinar,
} from './cuentaHelpers'
import {
  IcoCaja, IcoBandeja, IcoCamion, IcoChevron, IcoCorazon, IcoEscudo, IcoEstrella,
} from './iconosCuenta'
import { Avatar, Miniatura, TarjetaAcceso } from './piezasCuenta'
import type { SolicitudBusqueda } from '../../servicios/serviciosHelpers'

type CuentaResumenProps = {
  nombre: string | null
  correo: string | null
  esDesktop: boolean
  pedidos: PedidoCliente[]
  pedidoEnCurso: PedidoCliente[] | null
  solicitudes: SolicitudBusqueda[]
  porOpinar: ProductoPorOpinar[]
  favoritos: number
  twoFAActiva: boolean
  eventos: EventoActividad[]
}

const ICONO_EVENTO = { pedido: <IcoCamion size={18} />, solicitud: <IcoBandeja size={18} />, opinion: <IcoEstrella size={18} /> }
const FONDO_EVENTO = { azul: 'bg-hc-blue-50 text-hc-blue-600', verde: 'bg-hc-green-50 text-hc-success', ambar: 'bg-hc-warning-bg text-hc-warning' }

/** Resumen de Mi cuenta: móvil `28:1196` y escritorio `30:1479` (el menú lateral lo pone `ProfilePage`). */
export default function CuentaResumen(props: CuentaResumenProps) {
  const { esDesktop, nombre, correo, pedidos, pedidoEnCurso, solicitudes, porOpinar, favoritos, twoFAActiva, eventos } = props
  const { t, i18n } = useTranslation()
  const { total, enCamino } = resumenDePedidos(pedidos)
  const cotizadas = solicitudesCotizadas(solicitudes)
  const enBusqueda = solicitudesEnBusqueda(solicitudes)
  const pendientes = productosPendientesDeOpinar(porOpinar).length

  const detallePedidos = esDesktop && enCamino > 0
    ? t('cuenta.acceso.pedidosEnCamino', { count: total, enCamino })
    : t('cuenta.acceso.pedidos', { count: total })
  const detalleSolicitudes = esDesktop
    ? [cotizadas > 0 && t('cuenta.acceso.cotizadas', { count: cotizadas }), enBusqueda > 0 && t('cuenta.acceso.enBusqueda', { count: enBusqueda })].filter(Boolean).join(' · ') || t('cuenta.acceso.sinSolicitudes')
    : cotizadas > 0 ? t('cuenta.acceso.cotizadas', { count: cotizadas }) : t('cuenta.acceso.solicitudes', { count: solicitudes.length })

  const accesos = (
    <>
      <TarjetaAcceso to="/mis-pedidos" icono={<IcoCaja size={22} />} titulo={t('cuenta.acceso.tituloPedidos')} detalle={detallePedidos} escritorio={esDesktop} />
      <TarjetaAcceso to="/servicios?vista=solicitudes" icono={<IcoBandeja size={22} />} titulo={t('cuenta.acceso.tituloSolicitudes')} detalle={detalleSolicitudes} escritorio={esDesktop} />
      <TarjetaAcceso to="/wishlist" icono={<IcoCorazon size={22} />} titulo={t('cuenta.menu.favoritos')} detalle={t('cuenta.acceso.guardados', { count: favoritos })} escritorio={esDesktop} />
      <TarjetaAcceso to="/perfil?vista=opiniones" icono={<IcoEstrella size={22} />} titulo={t('cuenta.acceso.tituloOpiniones')} detalle={t('cuenta.acceso.pendientes', { count: pendientes })} escritorio={esDesktop} />
    </>
  )

  const feed = eventos.length > 0 && (
    <section className={esDesktop ? 'flex flex-col gap-5' : 'flex flex-col gap-[10px] px-4 pb-5 pt-[22px]'}>
      <h2 className={`font-display font-bold leading-[normal] text-hc-n-900 ${esDesktop ? 'text-[18px]' : 'text-[17px]'}`}>
        {t('cuenta.actividad.titulo')}
      </h2>
      <ul className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
        {eventos.map((evento, i) => {
          const hace = haceCuanto(evento.fecha)
          const detalle = evento.detalle ? t(evento.detalle.clave, evento.detalle.valores) : null
          const tiempo = hace ? t(hace.clave, hace.valores) : null
          return (
            <li key={evento.id} className={i > 0 ? 'border-t border-hc-n-200' : ''}>
              <Link to={evento.to} className={`flex items-center leading-[normal] hover:bg-hc-n-50 ${esDesktop ? 'gap-[14px] px-[18px] py-[14px]' : 'gap-3 px-[14px] py-3'}`}>
                {esDesktop ? (
                  <span className="text-hc-blue-600">{ICONO_EVENTO[evento.tipo]}</span>
                ) : (
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${FONDO_EVENTO[evento.tono]}`}>{ICONO_EVENTO[evento.tipo]}</span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-[14px] font-medium text-hc-n-900">{t(evento.titulo.clave, evento.titulo.valores)}</span>
                  {!esDesktop && (detalle || tiempo) && (
                    <span className="text-[12px] text-hc-n-500">{[detalle, tiempo].filter(Boolean).join(' · ')}</span>
                  )}
                </span>
                {esDesktop && tiempo && <span className="shrink-0 text-[12px] text-hc-n-500">{tiempo[0].toUpperCase() + tiempo.slice(1)}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )

  const activo = pedidoEnCurso ? <PedidoActivo pedidos={pedidoEnCurso} esDesktop={esDesktop} idioma={i18n.language} /> : null

  if (esDesktop) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <h1 className="font-display text-[28px] font-bold leading-[normal] text-hc-n-900">{t('cuenta.hola', { nombre: primerNombre(nombre) })}</h1>
        {activo}
        <div className="grid grid-cols-4 gap-4">{accesos}</div>
        {feed}
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-hc-n-50">
      <header className="flex flex-col gap-[14px] bg-hc-n-0 px-4 pb-[18px] pt-5">
        <div className="flex items-center gap-3">
          <Avatar texto={iniciales(nombre)} />
          <div className="flex min-w-0 flex-1 flex-col gap-px leading-[normal]">
            <h1 className="truncate font-display text-[20px] font-bold text-hc-n-900">{t('cuenta.hola', { nombre: primerNombre(nombre) })}</h1>
            <p className="truncate text-[13px] text-hc-n-500">{correo}</p>
          </div>
        </div>
        {activo}
      </header>
      <section className="flex flex-col gap-[10px] px-4 pb-2 pt-[18px]">
        <div className="grid grid-cols-2 gap-[10px]">{accesos}</div>
        <Link to="/perfil?vista=seguridad" className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px] leading-[normal] hover:border-hc-blue-100">
          <span className="text-hc-blue-600"><IcoEscudo size={22} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-[14px] font-semibold text-hc-n-900">{t('cuenta.menu.seguridad')}</span>
            <span className={`text-[12px] ${twoFAActiva ? 'text-hc-success' : 'text-hc-n-500'}`}>
              {twoFAActiva ? t('cuenta.seguridad.dosPasosActiva') : t('cuenta.seguridad.dosPasosInactiva')}
            </span>
          </span>
          <span className="text-hc-n-500"><IcoChevron /></span>
        </Link>
      </section>
      {feed}
    </div>
  )
}

/** Pedido en curso destacado: móvil `28:1204` y escritorio `30:1541`. */
function PedidoActivo({ pedidos, esDesktop, idioma }: { pedidos: PedidoCliente[]; esDesktop: boolean; idioma: string }) {
  const { t } = useTranslation()
  const principal = pedidos[0]
  const estado = estadoGlobal(pedidos)
  const numero = etiquetaPedido(principal.numeroPedido)
  const fotos = miniaturasDePedido(pedidos, 2)
  const guia = pedidos.find((p) => p.numeroGuia)?.numeroGuia
  const llegada = fechaCorta(pedidos.find((p) => p.fechaEntregaEstimada)?.fechaEntregaEstimada, idioma)
  const destino = principal.numeroPedido ? `/mis-pedidos?pedido=${encodeURIComponent(principal.numeroPedido)}` : '/mis-pedidos'
  const lineaLlegada = llegada ? t('cuenta.activo.llega', { fecha: llegada }) : t(`cuenta.activo.enCurso.${estado}`, { defaultValue: '' })

  if (esDesktop) {
    return (
      <div className="flex flex-col gap-3 rounded-[14px] border border-hc-blue-100 bg-hc-blue-50 p-[18px] leading-[normal]">
        <p className="text-[11px] font-semibold uppercase text-hc-blue-600">{t('cuenta.activo.titulo')}</p>
        <div className="flex items-center gap-3">
          {fotos.map((f, i) => <Miniatura key={i} src={f.src} tam={64} />)}
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <p className="text-[15px] font-semibold text-hc-n-900">{t('cuenta.activo.numeroEstado', { numero, estado: t(`cuenta.estado.${estado}`) })}</p>
            {lineaLlegada && <p className="text-[13px] text-hc-n-600">{lineaLlegada}</p>}
            {guia && <p className="font-mono text-[12px] font-medium text-hc-n-500">{t('cuenta.activo.guia', { guia })}</p>}
          </div>
          <Link to={destino} className="flex shrink-0 items-center justify-center rounded-[12px] bg-hc-blue-600 px-[14px] py-[11px] text-[14px] font-semibold text-hc-n-0 hover:bg-hc-blue-900">
            {t('cuenta.activo.verSeguimiento')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <Link to={destino} className="flex flex-col gap-[10px] rounded-[14px] border border-hc-blue-100 bg-hc-blue-50 p-[14px] leading-[normal]">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold text-hc-n-900">
          {t('cuenta.activo.numeroEnCurso', { numero, estado: t(`cuenta.activo.enCurso.${estado}`, { defaultValue: t(`cuenta.estado.${estado}`) }) })}
        </span>
        <ChipEstadoPedido estado={estadoDePedidoVisible(estado, pedidos)} />
      </span>
      <span className="flex items-center gap-[10px]">
        {fotos.map((f, i) => <Miniatura key={i} src={f.src} tam={44} />)}
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          {lineaLlegada && <span className="truncate text-[13px] font-medium text-hc-n-900">{lineaLlegada}</span>}
          {guia && <span className="truncate text-[12px] text-hc-n-500">{t('cuenta.activo.correosGuia', { guia })}</span>}
        </span>
        <span className="text-hc-blue-600"><IcoChevron /></span>
      </span>
    </Link>
  )
}

/** El chip del pedido en curso muestra el estado del primer paquete cuando el global no tiene etiqueta propia. */
function estadoDePedidoVisible(global: string, pedidos: PedidoCliente[]): string {
  return global || estadoDePedido(pedidos[0])
}
