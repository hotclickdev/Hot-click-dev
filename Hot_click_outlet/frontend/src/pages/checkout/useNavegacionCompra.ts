import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CheckoutPayload } from '@/types/pedido'
import type { ItemCarrito } from '@/types/carrito'
import { formatPrice } from '@/utils/format'
import { guardarCompra } from './compraGuardada'
import { ejecutarPagarCheckout } from './ejecutarPagarCheckout'
import type { FormularioCompra } from './useFormularioCompra'
import type { PasoCompra } from './validacionCompra'

type NavegacionCompraDeps = {
  form: FormularioCompra
  items: ItemCarrito[]
  estado: string
  intentos: number
  maxIntentos: number
  iniciarPago: (payload: CheckoutPayload, isGuest?: boolean, isSinpe?: boolean) => void
}

const CLAVE_BOTON: Record<PasoCompra, string> = {
  1: 'compra.checkout.continuarEntrega',
  2: 'compra.checkout.continuarPago',
  3: 'compra.pago.pagar',
}

function enfocarPrimerError() {
  setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0)
}

/** Pasos del checkout móvil, botón de cada paso y el pago (en desktop todo está en una página). */
export function useNavegacionCompra({ form, items, estado, intentos, maxIntentos, iniciarPago }: NavegacionCompraDeps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [paso, setPaso] = useState<PasoCompra>(1)
  const [paquetesPagados, setPaquetesPagados] = useState(0)

  function validarTodo(): boolean {
    const pasoConError = form.validarPasos([1, 2, 3])
    if (pasoConError === null) return true
    setPaso(pasoConError)
    enfocarPrimerError()
    return false
  }

  function pagar() {
    const iniciado = ejecutarPagarCheckout({
      aceptaDatos: form.aceptaDatos,
      validarTodo,
      token: form.token,
      metodoPago: form.metodoPago,
      datos: form.datos,
      direccion: form.direccion,
      paquetes: form.paquetes,
      envios: form.envios,
      items,
      totalFinal: form.totales.total,
      cuponCodigo: form.cupon.cupon?.codigo ?? null,
      gcCodigo: form.giftCard.aplicada?.codigo ?? null,
      iniciarPago,
    })
    if (!iniciado) return
    setPaquetesPagados(form.paquetes.length)
    guardarCompra({
      nombre: form.datos.nombre,
      correo: form.datos.correo,
      total: form.totales.total,
      paquetes: form.paquetes,
      envios: form.envios,
    })
  }

  function avanzar() {
    if (paso === 3) {
      pagar()
      return
    }
    if (form.validarPasos([paso]) !== null) {
      enfocarPrimerError()
      return
    }
    setPaso(paso === 1 ? 2 : 3)
    globalThis.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function volver() {
    if (paso === 1) navigate('/carrito')
    else setPaso(paso === 3 ? 2 : 1)
  }

  const ocupado = estado === 'loading' || estado === 'redirecting' || intentos >= maxIntentos
  return {
    paso,
    paquetesPagados,
    pagar,
    avanzar,
    volver,
    pagoBloqueado: !form.aceptaDatos || ocupado,
    textoBotonPaso: t(CLAVE_BOTON[paso], { total: formatPrice(form.totales.total) }),
    textoPagar: t(CLAVE_BOTON[3], { total: formatPrice(form.totales.total) }),
  }
}
