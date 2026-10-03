import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import IconoFigma from '@/components/comprador/IconoFigma'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoBuscarNada, IconoSinConexion } from '@/components/comprador/estados/iconosEstado'
import iconoCuenta from '@/assets/figma/comprador/seguimiento-cuenta.svg'
import { formatPrice } from '@/utils/format'
import { seguimientoPedidoService, type SeguimientoPedido } from '@/services/seguimientoPedidoService'
import PaqueteSeguimientoCard from './seguimiento/PaqueteSeguimientoCard'
import {
  RUTA_CREAR_CUENTA,
  contarEntregados,
  formatearFecha,
  seguimientoDesdeRespuesta,
  tokenConFormatoValido,
} from './seguimiento/seguimientoHelpers'

type Carga =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; pedido: SeguimientoPedido }
  | { tipo: 'noEncontrado' }
  | { tipo: 'error' }

function statusDeError(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status
}

/**
 * Seguimiento de pedido sin cuenta · móvil (Figma 44:1701). Se abre desde el enlace con token
 * de los correos de confirmación, guía y seguimiento. Sin dirección, teléfono ni datos de pago.
 */
export default function SeguimientoPedidoPage() {
  const { token } = useParams()
  const { t, i18n } = useTranslation()
  const [respuesta, setRespuesta] = useState<Carga>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)
  const tokenValido = tokenConFormatoValido(token)

  useEffect(() => {
    if (!tokenValido || !token) return
    let vigente = true
    seguimientoPedidoService.porToken(token)
      .then(({ data }) => {
        const pedido = seguimientoDesdeRespuesta(data)
        if (vigente) setRespuesta(pedido ? { tipo: 'listo', pedido } : { tipo: 'noEncontrado' })
      })
      .catch((err: unknown) => {
        if (vigente) setRespuesta(statusDeError(err) === 404 ? { tipo: 'noEncontrado' } : { tipo: 'error' })
      })
    return () => { vigente = false }
  }, [token, tokenValido, intento])

  const reintentar = useCallback(() => {
    setRespuesta({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }, [])

  const carga: Carga = tokenValido ? respuesta : { tipo: 'noEncontrado' }

  return (
    <MainLayout variante="marca" barraInferior={false}>
      <Helmet>
        <title>{t('comprador.seguimiento.tituloPagina')}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <div className="mx-auto w-full max-w-[560px]">
        {carga.tipo === 'cargando' && (
          <div className="flex justify-center py-32" role="status" aria-label={t('comprador.seguimiento.cargando')}>
            <Spinner size="xl" variante="figma" />
          </div>
        )}
        {carga.tipo === 'noEncontrado' && (
          <EstadoVacio
            nivel="h1"
            icono={<IconoBuscarNada />}
            titulo={t('comprador.seguimiento.noEncontradoTitulo')}
            texto={t('comprador.seguimiento.noEncontradoTexto')}
            accion={{ texto: t('comprador.seguimiento.irAlInicio'), to: '/' }}
            secundaria={{ texto: t('comprador.seguimiento.iniciarSesion'), to: '/login' }}
          />
        )}
        {carga.tipo === 'error' && (
          <EstadoVacio
            nivel="h1"
            icono={<IconoSinConexion />}
            titulo={t('comprador.seguimiento.errorTitulo')}
            texto={t('comprador.seguimiento.errorTexto')}
            accion={{ texto: t('comprador.seguimiento.reintentar'), onClick: reintentar }}
          />
        )}
        {carga.tipo === 'listo' && <Seguimiento pedido={carga.pedido} idioma={i18n.language || 'es'} />}
      </div>
    </MainLayout>
  )
}

function Seguimiento({ pedido, idioma }: { pedido: SeguimientoPedido; idioma: string }) {
  const { t } = useTranslation()
  const encabezado = [
    pedido.numeroPedido,
    pedido.fechaPedido ? formatearFecha(pedido.fechaPedido, idioma) : null,
    pedido.total != null ? formatPrice(pedido.total) : null,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <section className="flex flex-col gap-[6px] px-5 pb-[6px] pt-[18px]">
        <h1 className="font-display text-[20px] font-bold text-hc-n-900">{t('comprador.seguimiento.titulo')}</h1>
        <p className="text-[13px] text-hc-n-600">{encabezado}</p>
        <p className="text-[14px] font-semibold text-hc-blue-600">
          {t('comprador.seguimiento.paquetes', { count: pedido.paquetes.length })}
          {' · '}
          {t('comprador.seguimiento.entregados', { count: contarEntregados(pedido.paquetes) })}
        </p>
      </section>

      <ul className="flex flex-col gap-3 px-5 pb-2 pt-[10px]">
        {pedido.paquetes.map((paquete, i) => (
          <PaqueteSeguimientoCard key={`${paquete.tienda ?? ''}-${i}`} paquete={paquete} numero={i + 1} />
        ))}
      </ul>

      {pedido.invitarCrearCuenta && (
        <section className="px-5 py-2">
          <div className="flex flex-col gap-[10px] rounded-[14px] bg-hc-blue-50 p-4">
            <div className="flex items-center gap-2 text-hc-blue-600">
              <IconoFigma src={iconoCuenta} size={18} />
              <h2 className="text-[14px] font-semibold">{t('comprador.seguimiento.crearCuentaTitulo')}</h2>
            </div>
            <p className="text-[13px] leading-[18px] text-hc-n-600">{t('comprador.seguimiento.crearCuentaTexto')}</p>
            <Link
              to={RUTA_CREAR_CUENTA}
              className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 py-[14px] text-[15px] font-semibold text-hc-n-0 hover:bg-hc-red-600"
            >
              {t('comprador.seguimiento.crearCuentaCta')}
            </Link>
          </div>
        </section>
      )}
      <div className="pb-6" aria-hidden="true" />
    </>
  )
}
