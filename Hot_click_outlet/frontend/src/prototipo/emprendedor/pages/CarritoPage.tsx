import { useLocation, useNavigate } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import Miniatura from '../ui/Miniatura'
import { COSTO_ENVIO_DEMO, RUTA_EMPRENDEDOR } from '../constants'
import { PRODUCTOS_DEMO } from '../data/catalogoDemo'

/**
 * Paso 11 Carrito (Figma 37:128).
 */
export default function CarritoPage() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { productoId?: string } }
  const producto = PRODUCTOS_DEMO.find((p) => p.id === location.state?.productoId) ?? PRODUCTOS_DEMO[0]
  const total = producto.precio + COSTO_ENVIO_DEMO

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-8">
      <CabeceraAtras titulo="Tu carrito" to={`${RUTA_EMPRENDEDOR}/tienda/${producto.id}`} />
      <div className="flex items-center gap-3">
        <Miniatura src={producto.imagenUrl} alt="" />
        <div>
          <p className="text-sm font-medium">{producto.nombre}</p>
          <p className="text-xs text-hc-muted">Cantidad: 1</p>
          <p className="text-[13px] font-bold text-hc-primary">{formatoColon(producto.precio)}</p>
        </div>
      </div>
      <hr className="border-hc-border" />
      <FilaResumen etiqueta="Subtotal" valor={formatoColon(producto.precio)} />
      <FilaResumen etiqueta="Envío" valor={formatoColon(COSTO_ENVIO_DEMO)} />
      <div className="flex justify-between text-[15px] font-bold">
        <span>Total</span>
        <span className="text-hc-primary">{formatoColon(total)}</span>
      </div>
      <BotonPrimario onClick={() => navigate(`${RUTA_EMPRENDEDOR}/tienda/compra-confirmada`)}>
        Confirmar compra
      </BotonPrimario>
    </main>
  )
}

function FilaResumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-hc-muted">{etiqueta}</span>
      <span className="font-medium">{valor}</span>
    </div>
  )
}
