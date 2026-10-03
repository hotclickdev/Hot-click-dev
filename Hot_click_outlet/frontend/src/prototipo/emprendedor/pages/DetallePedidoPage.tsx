import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marcarPedidoConGuiaApi, marcarPedidoEnviadoApi } from '@/prototipo/compartido/pedidosVendedorApi'
import { mensajeErrorDespacho, puedeDespachar } from '@/prototipo/compartido/estadoPedidoVendedor'
import EstadoVacioConversacional from '@/prototipo/compartido/motion/EstadoVacioConversacional'
import CabeceraAtras from '../ui/CabeceraAtras'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { usePedidosEmprendedor } from '../hooks/usePedidosEmprendedor'
import DespacharPedidoVista from './DespacharPedidoVista'

/**
 * Detalle de pedido y despacho (Figma `37:1780`, antes 128:157 / 352:10640).
 * Con número de guía usa `PUT /pedidos/:id/guia` (ENVIADO + correo al cliente); sin guía conserva el cambio de estado.
 */
export default function DetallePedidoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { pedidos, cargando, error } = usePedidosEmprendedor()
  const [marcando, setMarcando] = useState(false)
  const [errorMarca, setErrorMarca] = useState<string | null>(null)
  const [guia, setGuia] = useState('')
  const pedido = pedidos.find((p) => p.id === id)

  async function marcarEnviado() {
    setMarcando(true)
    setErrorMarca(null)
    try {
      const numeroGuia = guia.trim()
      if (numeroGuia) await marcarPedidoConGuiaApi(id, numeroGuia)
      else await marcarPedidoEnviadoApi(id)
      navigate(`${RUTA_EMPRENDEDOR}/pedidos`)
    } catch (err: unknown) {
      console.error('[DetallePedido]', err)
      setErrorMarca(mensajeErrorDespacho(err, t('despacho.error')))
    } finally {
      setMarcando(false)
    }
  }

  if (cargando) {
    return (
      <main className="px-5 py-8 md:px-16 md:py-12">
        <CabeceraAtras titulo={t('despacho.tituloPedido')} to={`${RUTA_EMPRENDEDOR}/pedidos`} />
        <p className="mt-4 text-sm text-hc-muted">{t('despacho.cargando')}</p>
      </main>
    )
  }

  if (error || !pedido) {
    return (
      <main className="px-5 py-8 md:px-16 md:py-12">
        <CabeceraAtras titulo={t('despacho.tituloPedido')} to={`${RUTA_EMPRENDEDOR}/pedidos`} />
        <EstadoVacioConversacional
          titulo={error ? 'No pudimos cargar el pedido' : 'No encontramos ese pedido'}
          mensaje={error ?? 'Puede que el enlace ya no valga. Volvé al listado e intentá de nuevo.'}
        />
      </main>
    )
  }

  return (
    <EmprendedorPageFrame titulo={puedeDespachar(pedido.estado) ? t('despacho.titulo') : `Pedido #${pedido.id}`} volverA={`${RUTA_EMPRENDEDOR}/pedidos`}>
      <DespacharPedidoVista pedido={pedido} guia={guia} onGuia={setGuia} marcando={marcando} error={errorMarca} onMarcar={() => void marcarEnviado()} />
    </EmprendedorPageFrame>
  )
}
