import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { formatPrice } from '@/utils/format'
import {
  encargoService,
  encargoDesdeRespuesta,
  type Encargo,
} from '@/services/encargoService'
import { useToast } from '@/components/ui/Toast'
import { urlWhatsApp } from './carrito/cartHelpers'
import { IcoBuscarCaja } from './perfil/cuenta/iconosCuenta'
import { IcoSrv } from './servicios/IcoSrv'
import { pasosDelEncargo, referenciasDelEncargo, type PasoEncargo } from './encargo/encargoHelpers'

const TARJETA = 'rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4'

function Marca({ estado }: { estado: PasoEncargo['estado'] }) {
  if (estado === 'hecho') {
    return <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-hc-success"><IcoSrv nombre="encargoCheck" size={13} /></span>
  }
  if (estado === 'error') {
    return (
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-hc-danger text-hc-n-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </span>
    )
  }
  return <span className={`size-[22px] shrink-0 rounded-full ${estado === 'actual' ? 'bg-hc-blue-600' : 'bg-hc-n-200'}`} />
}

function LineaDeTiempo({ pasos }: { pasos: PasoEncargo[] }) {
  const { t } = useTranslation()
  return (
    <section className={TARJETA} aria-labelledby="encargo-estado">
      <h2 id="encargo-estado" className="font-sans tracking-normal leading-[normal] text-[14px] font-semibold text-hc-n-900">{t('encargoPublico.estado')}</h2>
      <ol className="flex flex-col">
        {pasos.map((p) => (
          <li key={p.clave} className="flex items-start gap-3 pt-3" aria-current={p.estado === 'actual' ? 'step' : undefined}>
            <Marca estado={p.estado} />
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <p className={`text-[14px] [overflow-wrap:anywhere] ${p.estado === 'pendiente' ? 'font-semibold text-hc-n-600' : p.estado === 'actual' ? 'font-bold text-hc-n-900' : 'font-semibold text-hc-n-900'}`}>{p.titulo}</p>
              {p.detalle && <p className="text-[12px] text-hc-n-600 [overflow-wrap:anywhere]">{p.detalle}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function EncargoPublicPage() {
  const { token } = useParams()
  const toast = useToast()
  const { t } = useTranslation()
  const [encargo, setEncargo] = useState<Encargo | null>(null)
  const [loading, setLoading] = useState(true)
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    if (!token) return
    encargoService.porToken(token)
      .then(({ data }) => setEncargo(encargoDesdeRespuesta(data)))
      .catch(() => setEncargo(null))
      .finally(() => setLoading(false))
  }, [token])

  async function pagar() {
    if (!token || !encargo) return
    setPagando(true)
    try {
      const { data } = await encargoService.checkout(token, {
        metodoEnvio: 'RETIRO_EN_TIENDA',
        provider: 'STRIPE',
      })
      const body = data as { data?: { redirectUrl?: string }; redirectUrl?: string }
      const url = body.data?.redirectUrl || body.redirectUrl
      if (url) {
        window.location.href = url
        return
      }
      toast({ message: t('encargoPublico.checkoutIniciado'), type: 'success' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ message: msg || t('encargoPublico.pagoError'), type: 'error' })
    } finally {
      setPagando(false)
    }
  }

  if (loading) {
    return (
      <MainLayout variante="interna" titulo={t('encargoPublico.titulo')}>
        <div className="flex justify-center py-32"><Spinner size="xl" /></div>
      </MainLayout>
    )
  }

  if (!encargo) {
    return (
      <MainLayout variante="interna" titulo={t('encargoPublico.titulo')}>
        <div className="bg-hc-n-0 max-lg:min-h-[calc(100dvh-123px)]">
          <EstadoVacio
            nivel="h1"
            tono="azul"
            espaciado="cuenta"
            icono={<IcoBuscarCaja size={28} />}
            titulo={t('encargoPublico.noEncontrado')}
            texto={t('encargoPublico.enlaceInvalido')}
            accion={{ texto: t('encargoPublico.volverCatalogo'), to: '/productos' }}
          />
        </div>
      </MainLayout>
    )
  }

  const refs = referenciasDelEncargo(encargo)
  const pasos = pasosDelEncargo(encargo, formatPrice, t)
  const porPagar = encargo.estado === 'APROBADO' && encargo.precioCotizado != null
  const mensaje = encodeURIComponent(t('encargoPublico.waMensaje', { id: encargo.id }))

  return (
    <MainLayout variante="interna" titulo={t('encargoPublico.titulo')}>
      <div className="flex flex-col leading-[normal] lg:mx-auto lg:w-full lg:max-w-[560px]">
        <div className="flex flex-col gap-[14px] px-4 pb-3 pt-[18px] lg:px-0">
          <section className={`${TARJETA} flex items-center gap-3`}>
            {refs[0]
              ? <img src={refs[0]} alt={t('encargoPublico.referencia')} className="size-16 shrink-0 rounded-[12px] object-cover" />
              : <span aria-hidden="true" className="size-16 shrink-0 rounded-[12px] bg-hc-n-100" />}
            <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
              <span className="rounded-full bg-hc-warning-bg px-2 py-[3px] text-[11px] font-semibold text-hc-warning">{t('comprador.tarjeta.hechoAPedido')}</span>
              <h1 className="font-sans tracking-normal leading-[normal] text-[15px] font-semibold text-hc-n-900 [overflow-wrap:anywhere]">{encargo.productoNombre || t('encargoPublico.titulo')}</h1>
              <p className="text-[12px] text-hc-n-600">{t('encargoPublico.numero', { id: encargo.id })}</p>
            </div>
          </section>

          <LineaDeTiempo pasos={pasos} />

          {(refs.length > 1 || encargo.notas || encargo.mensajeVendedor) && (
            <section className={`${TARJETA} flex flex-col gap-3`}>
              {refs.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {refs.slice(1).map((url) => (
                    <img key={url} src={url} alt={t('encargoPublico.referencia')} className="aspect-square rounded-[12px] border border-hc-n-200 object-cover" />
                  ))}
                </div>
              )}
              {encargo.notas && (
                <div>
                  <p className="text-[12px] text-hc-n-600">{t('encargoPublico.tusNotas')}</p>
                  <p className="text-[14px] text-hc-n-900 [overflow-wrap:anywhere]">{encargo.notas}</p>
                </div>
              )}
              {encargo.mensajeVendedor && (
                <div>
                  <p className="text-[12px] text-hc-n-600">{t('encargoPublico.mensajeTienda')}</p>
                  <p className="text-[14px] text-hc-n-900 [overflow-wrap:anywhere]">{encargo.mensajeVendedor}</p>
                </div>
              )}
            </section>
          )}

          {encargo.precioCotizado != null && encargo.estado !== 'RECHAZADO' && (
            <section className={`${TARJETA} flex flex-col gap-[6px]`}>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-hc-n-600">{t('encargoPublico.producto')}</span>
                <span className="text-hc-n-900">{formatPrice(encargo.precioCotizado)}</span>
              </div>
              <div className="flex items-center justify-between text-hc-n-900">
                <span className="text-[15px] font-semibold">{t('encargoPublico.total')}</span>
                <span className="font-display text-[18px] font-bold">{formatPrice(encargo.precioCotizado)}</span>
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-2 bg-hc-n-0 px-4 pb-6 pt-3 lg:rounded-[16px]">
          {porPagar && (
            <>
              <button
                type="button"
                disabled={pagando}
                onClick={() => void pagar()}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0 disabled:opacity-50"
              >
                <IcoSrv nombre="encargoTarjeta" size={18} />
                {pagando ? t('encargoPublico.redirigiendo') : t('encargoPublico.pagar', { monto: formatPrice(encargo.precioCotizado) })}
              </button>
              <p className="text-center text-[12px] text-hc-n-600">{t('encargoPublico.plazoPago')}</p>
            </>
          )}
          <a
            href={urlWhatsApp(mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-[6px] text-[13px] font-semibold text-hc-blue-600"
          >
            <IcoSrv nombre="encargoChat" size={14} />
            {t('encargoPublico.escribirTienda')}
          </a>
        </div>
      </div>
    </MainLayout>
  )
}
