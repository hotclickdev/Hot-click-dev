import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { urlWhatsApp } from '../carrito/cartHelpers'
import { fechaCorta, fechaConAnio } from '../perfil/cuenta/cuentaHelpers'
import { IcoCaja, IcoEscudo, IcoEstrella, IcoExterno, IcoInfo, IcoPin, IcoWhatsapp } from '../perfil/cuenta/iconosCuenta'
import { Miniatura } from '../perfil/cuenta/piezasCuenta'
import ChipEstadoPedido from './ChipEstadoPedido'
import { estadoDePedido, itemsDePedido, notificacionesDePedido, ESTADO_LABELS } from './pedidoHelpers'
import type { PedidoCliente } from './pedidoHelpers'
import {
  cantidadProductos, diasDeGarantia, envioDelPedido, nombreTienda, paquetesEntregados, subtotalProductos, urlRastreo,
  type PedidoComprador,
} from './pedidoVistaHelpers'

/** Botón de acción del paquete (Figma `37:1406`): borde gris, 12 px semibold azul; apagado al 45 % si aún no aplica. */
function Accion({ icono, texto, to, href, activo, titulo }: { icono: ReactNode; texto: string; to?: string; href?: string; activo: boolean; titulo?: string }) {
  const clase = `flex min-w-0 flex-1 items-center justify-center gap-[6px] rounded-[10px] border border-hc-n-200 bg-hc-n-0 px-[10px] py-[9px] text-[12px] font-semibold leading-[normal] text-hc-blue-600 ${activo ? '' : 'opacity-45'}`
  const contenido = <>{icono}{texto}</>
  if (!activo) return <span aria-disabled="true" title={titulo} className={clase}>{contenido}</span>
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={clase}>{contenido}</a>
  return <Link to={to ?? '#'} className={clase}>{contenido}</Link>
}

function PaqueteDetalle({ paquete, numero, total, pedidoNumero }: { paquete: PedidoCliente; numero: number; total: number; pedidoNumero: string }) {
  const { t, i18n } = useTranslation()
  const [verNovedades, setVerNovedades] = useState(false)
  const estado = estadoDePedido(paquete)
  const tienda = nombreTienda(paquete) ?? ''
  const origen = paquete.bodega?.provincia ?? null
  const envio = paquete.costoEnvio ?? 0
  const guia = paquete.numeroGuia
  const rastreo = urlRastreo(paquete)
  const novedades = notificacionesDePedido(paquete)
  const entregado = estado === 'ENTREGADO'
  const retiro = paquete.metodoEnvio === 'RETIRO_EN_TIENDA'
  const dias = entregado ? diasDeGarantia(paquete) : 0
  const mensaje = encodeURIComponent(t('pedidoDetalle.mensajeWhatsapp', { numero: pedidoNumero, tienda }))

  const lineaGuia = (() => {
    if (entregado) return t('pedidoDetalle.entregadoEl', { fecha: fechaCorta(paquete.fechaEntregaReal ?? paquete.fechaPedido, i18n.language) })
    const salio = fechaCorta(paquete.fechaEnvio, i18n.language)
    const llega = fechaCorta(paquete.fechaEntregaEstimada, i18n.language)
    if (salio && llega) return t('pedidoDetalle.salioYLlega', { salio, llega })
    if (salio) return t('pedidoDetalle.soloSalio', { salio })
    if (llega) return t('pedidoDetalle.soloLlega', { llega })
    return null
  })()

  return (
    <article className="flex flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px] leading-[normal]">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-medium text-hc-n-600">{t('pedidoDetalle.paqueteDe', { n: numero, total })}</p>
        <ChipEstadoPedido estado={estado} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-hc-n-900"><IcoCaja size={18} /></span>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <h3 className="truncate text-[15px] font-semibold text-hc-n-900">{tienda || t('pedidoDetalle.tiendaSinNombre')}</h3>
          <p className="flex items-center gap-1 text-[12px] text-hc-n-600">
            <span className="shrink-0"><IcoPin size={12} /></span>
            <span className="truncate">
              {retiro
                ? (origen ? t('pedidoDetalle.retiroEn', { origen }) : t('pedidoDetalle.retiro'))
                : origen ? t('pedidoDetalle.sale', { origen, precio: formatPrice(envio) }) : t('pedidoDetalle.soloEnvio', { precio: formatPrice(envio) })}
            </span>
          </p>
        </div>
      </div>
      {itemsDePedido(paquete).map((item, i) => (
        <div key={i} className="flex items-center gap-[10px]">
          <span className="shrink-0 overflow-hidden rounded-[8px]"><Miniatura src={item.producto?.imagenPrincipalUrl} tam={44} /></span>
          <p className="min-w-0 flex-1 truncate text-[13px] text-hc-n-900">
            {(item.cantidad ?? 1) > 1 ? `${item.cantidad} × ` : ''}{item.nombreProducto ?? item.producto?.nombreProducto}
          </p>
          <p className="shrink-0 font-display text-[13px] font-semibold text-hc-n-900">{formatPrice(item.subtotalItem ?? item.precioUnitarioMomento)}</p>
        </div>
      ))}
      <div className="flex flex-col gap-1 rounded-[10px] bg-hc-n-50 px-3 py-[10px]">
        {guia ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-px">
                <p className="text-[11px] text-hc-n-600">{t('pedidoDetalle.guiaCorreos')}</p>
                <p className="font-mono text-[14px] font-medium text-hc-n-900">{guia}</p>
              </div>
              {rastreo && (
                <a href={rastreo} target="_blank" rel="noopener noreferrer" aria-label={t('pedidoDetalle.seguirGuia', { guia })} className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-hc-blue-600">
                  {t('pedidoDetalle.seguir')}
                  <IcoExterno size={14} />
                </a>
              )}
            </div>
            {lineaGuia && <p className="text-[12px] text-hc-n-600">{lineaGuia}</p>}
          </>
        ) : (
          <p className="text-[12px] leading-4 text-hc-n-600">
            {entregado && lineaGuia ? lineaGuia : t('pedidoDetalle.guiaPendiente', { tienda: tienda || t('pedidoDetalle.latienda') })}
          </p>
        )}
      </div>
      {novedades.length > 0 && (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setVerNovedades((v) => !v)} aria-expanded={verNovedades} className="self-start text-[12px] font-semibold text-hc-blue-600">
            {t('pedidoDetalle.novedades', { count: novedades.length })}
          </button>
          {verNovedades && (
            <ul className="flex flex-col gap-1 text-[12px] text-hc-n-600">
              {[...novedades].reverse().map((n, i) => (
                <li key={i}>
                  <span className="font-semibold text-hc-n-900">{ESTADO_LABELS[n.estado ?? ''] ?? n.estado}</span>
                  {n.fecha ? ` · ${fechaConAnio(n.fecha, i18n.language)}` : ''}{n.nota ? ` · ${n.nota}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Accion icono={<IcoWhatsapp size={15} />} texto={t('pedidoDetalle.whatsapp')} href={urlWhatsApp(mensaje)} activo />
        <Accion
          icono={<IcoEscudo size={15} />}
          texto={t('pedidoDetalle.garantia')}
          to="/servicios?vista=garantia"
          activo={entregado && dias > 0}
          titulo={entregado ? t('pedidoDetalle.garantiaVencida') : t('pedidoDetalle.garantiaAntes')}
        />
        <Accion
          icono={<IcoEstrella size={15} />}
          texto={t('pedidoDetalle.opinar')}
          to="/perfil?vista=opiniones"
          activo={entregado}
          titulo={t('pedidoDetalle.opinarAntes')}
        />
      </div>
    </article>
  )
}

/** Detalle de pedido por paquete: Figma `29:1434`. Se abre con `?pedido=<numero>` (sin ruta nueva). */
export default function DetallePedidoComprador({ pedido }: { pedido: PedidoComprador }) {
  const { t, i18n } = useTranslation()
  const { total: envioTotal, igual } = envioDelPedido(pedido)
  const metodo = pedido.paquetes.find((p) => p.metodoPago)?.metodoPago
  const fecha = fechaConAnio(pedido.fecha, i18n.language)
  const varios = pedido.paquetes.length > 1
  const productos = cantidadProductos(pedido)
  return (
    <div className="flex flex-col gap-3 px-4 pb-5 pt-[14px] leading-[normal] lg:mx-auto lg:w-full lg:max-w-[560px] lg:px-0">
      <section className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-[2px]">
            <p className="text-[12px] text-hc-n-600">{metodo ? t('pedidoDetalle.fechaPagadoCon', { fecha, metodo }) : fecha}</p>
            <h2 className="font-display text-[16px] font-semibold text-hc-n-900">
              {varios
                ? t('misPedidos.resumenPaquetes', { paquetes: t('misPedidos.paquetes', { count: pedido.paquetes.length }), entregados: t('misPedidos.paquetesEntregados', { count: paquetesEntregados(pedido) }) })
                : t('misPedidos.paquetes', { count: 1 })}
            </h2>
          </div>
          <p className="shrink-0 font-display text-[18px] font-bold text-hc-n-900">{formatPrice(pedido.total)}</p>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <p className="text-hc-n-600">{t('pedidoDetalle.productosLinea', { count: productos })}</p>
          <p className="text-hc-n-900">{formatPrice(subtotalProductos(pedido))}</p>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <p className="text-hc-n-600">
            {igual != null ? t('pedidoDetalle.envioN', { count: pedido.paquetes.length, precio: formatPrice(igual) }) : t('pedidoDetalle.envio')}
          </p>
          <p className="text-hc-n-900">{formatPrice(envioTotal)}</p>
        </div>
        {varios && (
          <p className="flex items-start gap-2 rounded-[10px] bg-hc-blue-50 px-[10px] py-2 text-[12px] leading-4 text-hc-blue-600">
            <span className="shrink-0"><IcoInfo size={16} /></span>
            <span className="min-w-0 flex-1">{t('pedidoDetalle.nota')}</span>
          </p>
        )}
      </section>
      {pedido.paquetes.map((p, i) => (
        <PaqueteDetalle key={p.id} paquete={p} numero={i + 1} total={pedido.paquetes.length} pedidoNumero={pedido.numero} />
      ))}
      <p className="text-[12px] leading-4 text-hc-n-600">{t('pedidoDetalle.pie')}</p>
    </div>
  )
}
