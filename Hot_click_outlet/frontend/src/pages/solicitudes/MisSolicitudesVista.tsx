import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import useAuthStore from '@/store/authStore'
import { servicioService } from '@/services/servicioService'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { urlWhatsApp } from '../carrito/cartHelpers'
import { fechaCorta } from '../perfil/cuenta/cuentaHelpers'
import { FONDO_BLANCO_VACIO } from '../perfil/cuenta/cuentaEstilos'
import { IcoBuscarCaja, IcoCamara, IcoChevron, IcoMas, IcoWhatsapp } from '../perfil/cuenta/iconosCuenta'
import { Miniatura } from '../perfil/cuenta/piezasCuenta'
import type { SolicitudBusqueda } from '../servicios/serviciosHelpers'
import {
  CLASE_CHIP_SOLICITUD, claveLinea, estadoVisual, fechaHora, fotosDeSolicitud, solicitudPorId,
} from './solicitudesHelpers'

const RUTA_LISTA = '/servicios?vista=solicitudes'

function ChipSolicitud({ estado }: { estado?: string }) {
  const { t } = useTranslation()
  const visual = estadoVisual(estado)
  return (
    <span className={`inline-flex shrink-0 items-center self-start rounded-full px-2 py-[3px] text-[11px] font-semibold leading-[normal] ${CLASE_CHIP_SOLICITUD[visual]}`}>
      {t(`solicitudes.estado.${visual}`)}
    </span>
  )
}

function TarjetaSolicitud({ solicitud }: { solicitud: SolicitudBusqueda }) {
  const { t, i18n } = useTranslation()
  const foto = fotosDeSolicitud(solicitud.fotosUrls)[0]
  const respuesta = solicitud.estado === 'ENCONTRADO' ? solicitud.notasAdmin?.trim() : ''
  return (
    <Link
      to={`${RUTA_LISTA}&solicitud=${encodeURIComponent(String(solicitud.id))}`}
      className="flex items-start gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px] leading-[normal]"
    >
      <Miniatura src={foto} tam={56} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
        <ChipSolicitud estado={solicitud.estado} />
        <span className="w-full text-[14px] font-semibold text-hc-n-900 [overflow-wrap:anywhere]">{solicitud.descripcion}</span>
        <span className="text-[12px] text-hc-n-500">{t('solicitudes.enviadaEl', { fecha: fechaCorta(solicitud.fechaCreacion, i18n.language) })}</span>
        {respuesta
          ? <span className="line-clamp-2 text-[12px] font-semibold text-hc-success">{respuesta}</span>
          : <span className="text-[12px] text-hc-n-600">{t(claveLinea(solicitud.estado))}</span>}
      </span>
      <span className="mt-[2px] text-hc-n-500"><IcoChevron /></span>
    </Link>
  )
}

function Vacio() {
  const { t } = useTranslation()
  return (
    <div className={FONDO_BLANCO_VACIO}>
      <EstadoVacio
        tono="azul"
        espaciado="cuenta"
        icono={<IcoBuscarCaja size={28} />}
        titulo={t('solicitudes.vacio.titulo')}
        texto={t('solicitudes.vacio.texto')}
        accion={{ texto: t('solicitudes.vacio.pedir'), to: '/servicios?vista=busqueda' }}
        secundaria={{ texto: t('solicitudes.vacio.garantia'), to: '/servicios?vista=garantia' }}
      />
    </div>
  )
}

function Lista({ solicitudes }: { solicitudes: SolicitudBusqueda[] }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col lg:mx-auto lg:w-full lg:max-w-[560px]">
      <h1 className="hidden font-display text-[28px] font-bold leading-[normal] text-hc-n-900 lg:block lg:pb-4 lg:pt-8">{t('cuenta.menu.solicitudes')}</h1>
      <div role="tablist" className="flex bg-hc-n-0 px-4 lg:bg-transparent lg:px-0">
        <span role="tab" aria-selected="true" className="flex-1 border-b-2 border-hc-blue-600 py-3 text-center text-[14px] font-semibold leading-[normal] text-hc-blue-600">{t('solicitudes.tabs.busquedas')}</span>
        <Link role="tab" aria-selected="false" to="/servicios?vista=garantia" className="flex-1 py-3 text-center text-[14px] font-medium leading-[normal] text-hc-n-500">{t('solicitudes.tabs.garantias')}</Link>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-5 pt-[14px] lg:px-0">
        <Link
          to="/servicios?vista=busqueda"
          className="flex items-center gap-3 rounded-[14px] border border-dashed border-hc-n-200 bg-hc-n-50 p-[14px] leading-[normal]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-hc-blue-600"><IcoCamara size={22} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-[14px] font-semibold text-hc-n-900">{t('solicitudes.nueva.titulo')}</span>
            <span className="text-[12px] text-hc-n-500">{t('solicitudes.nueva.texto')}</span>
          </span>
          <span className="text-hc-blue-600"><IcoMas size={20} /></span>
        </Link>
        {solicitudes.map((s) => <TarjetaSolicitud key={String(s.id)} solicitud={s} />)}
      </div>
    </div>
  )
}

/** Detalle de una búsqueda: Figma `29:1594`. El precio, la vigencia y el historial detallado no los entrega el backend. */
function Detalle({ solicitud }: { solicitud: SolicitudBusqueda }) {
  const { t, i18n } = useTranslation()
  const foto = fotosDeSolicitud(solicitud.fotosUrls)[0]
  const visual = estadoVisual(solicitud.estado)
  const respuesta = solicitud.notasAdmin?.trim()
  const mensaje = encodeURIComponent(t('solicitudes.detalle.mensajeWhatsapp', { descripcion: solicitud.descripcion }))
  const recibida = fechaHora(solicitud.fechaCreacion, fechaCorta(solicitud.fechaCreacion, i18n.language))
  const eventos = [
    solicitud.estado && solicitud.estado !== 'PENDIENTE' ? { texto: t(`solicitudes.detalle.historial.${solicitud.estado}`), tiempo: '' } : null,
    { texto: t('solicitudes.detalle.historial.recibida'), tiempo: recibida },
  ].filter((e): e is { texto: string; tiempo: string } => e !== null)
  return (
    <div className="flex flex-col gap-3 px-4 pb-5 pt-[14px] leading-[normal] lg:mx-auto lg:w-full lg:max-w-[560px] lg:px-0">
      <section className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
        <p className="text-[11px] font-semibold uppercase text-hc-n-500">{t('solicitudes.detalle.loPediste')}</p>
        <div className="flex items-start gap-3">
          <Miniatura src={foto} tam={72} />
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <p className="text-[14px] font-semibold text-hc-n-900 [overflow-wrap:anywhere]">{solicitud.descripcion}</p>
            {solicitud.presupuesto?.trim() && (
              <p className="text-[12px] leading-4 text-hc-n-600">{t('solicitudes.detalle.presupuesto', { presupuesto: solicitud.presupuesto })}</p>
            )}
          </div>
        </div>
      </section>

      {respuesta && (
        <section className={`flex flex-col gap-[10px] rounded-[14px] border p-[14px] ${visual === 'cotizada' ? 'border-hc-success bg-hc-green-50' : 'border-hc-n-200 bg-hc-n-0'}`}>
          <p className={`text-[11px] font-semibold uppercase ${visual === 'cotizada' ? 'text-hc-success' : 'text-hc-n-500'}`}>
            {visual === 'cotizada' ? t('solicitudes.detalle.teLaConseguimos') : t('solicitudes.detalle.respuesta')}
          </p>
          <p className="text-[14px] font-semibold text-hc-n-900 [overflow-wrap:anywhere]">{respuesta}</p>
        </section>
      )}

      <a
        href={urlWhatsApp(mensaje)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-3 text-[14px] font-semibold text-hc-n-900"
      >
        <IcoWhatsapp size={18} />
        {t('solicitudes.detalle.preguntar')}
      </a>

      <section className="flex flex-col gap-2 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
        <h2 className="text-[14px] font-semibold text-hc-n-900">{t('solicitudes.detalle.historialTitulo')}</h2>
        {eventos.map((e, i) => (
          <div key={i} className="flex items-center gap-[10px]">
            <span className="size-2 shrink-0 rounded-full bg-hc-n-200" />
            <p className="min-w-0 flex-1 text-[13px] text-hc-n-900">{e.texto}</p>
            {e.tiempo && <p className="shrink-0 text-[12px] text-hc-n-500">{e.tiempo}</p>}
          </div>
        ))}
      </section>
    </div>
  )
}

/** Mis solicitudes (`29:1535`), solicitud cotizada (`29:1594`) y estado vacío (`45:1896`) dentro de `/servicios`. */
export default function MisSolicitudesVista() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const [busqueda] = useSearchParams()
  const idSolicitud = busqueda.get('solicitud')

  const { data, isLoading } = useQuery({
    queryKey: ['mis-solicitudes-servicio'],
    queryFn: () => servicioService.misSolicitudes().then((r) => r.data),
    enabled: !!token,
    refetchOnWindowFocus: true,
  })

  if (!token) return <Navigate to={rutaLoginConRetorno(RUTA_LISTA)} replace />

  const solicitudes = Array.isArray(data) ? (data as SolicitudBusqueda[]) : []
  const detalle = solicitudPorId(solicitudes, idSolicitud)

  const cuerpo = (() => {
    if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
    if (idSolicitud) {
      return detalle
        ? <Detalle solicitud={detalle} />
        : <p className="px-4 py-10 text-center text-[13px] text-hc-n-600">{t('solicitudes.noEncontrada')}</p>
    }
    return solicitudes.length === 0 ? <Vacio /> : <Lista solicitudes={solicitudes} />
  })()

  const enDetalle = Boolean(idSolicitud && detalle)
  return (
    <MainLayout
      variante="interna"
      titulo={enDetalle ? t('solicitudes.detalle.titulo') : t('cuenta.menu.solicitudes')}
      esTituloPrincipal
      atras={idSolicitud ? RUTA_LISTA : '/perfil'}
      barraInferior={!enDetalle}
      acciones={enDetalle && detalle ? <ChipSolicitud estado={detalle.estado} /> : undefined}
    >
      {cuerpo}
    </MainLayout>
  )
}
