import { useState } from 'react'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { usePayment } from '@/hooks/usePayment'
import { BODEGA_DEFAULT, ESTADOS_SUBMITTING, ESTADOS_PENDING } from './posPayment/posPaymentConstants'
import { validate, buildNotas, openSinpeWhatsApp } from './posPayment/posPaymentHelpers'
import PosPaymentPendingView from './posPayment/PosPaymentPendingView'
import PosPaymentCartSummary from './posPayment/PosPaymentCartSummary'
import PosPaymentEntrega from './posPayment/PosPaymentEntrega'
import PosPaymentMetodo from './posPayment/PosPaymentMetodo'
import PosPaymentContacto from './posPayment/PosPaymentContacto'
import PosPaymentFooter from './posPayment/PosPaymentFooter'

/**
 * Mini checkout embebido en el modal de chat.
 * Solo SINPE y EFECTIVO: métodos sin redirección externa.
 */
export default function POSPaymentPanel({ onClose }) {
  const { items, total } = useCartStore()
  const { token } = useAuthStore()
  const { estado, pagoData, error: payError, iniciarPago } = usePayment()

  const [metodo,    setMetodo]    = useState('SINPE')
  const [entrega,   setEntrega]   = useState('RETIRO_EN_TIENDA')
  const [nombre,    setNombre]    = useState('')
  const [telefono,  setTelefono]  = useState('')
  const [email,     setEmail]     = useState('')
  const [direccion, setDireccion] = useState('')
  const [error,     setError]     = useState('')

  const needsAddress = entrega !== 'RETIRO_EN_TIENDA'
  const shipping = entrega === 'RETIRO_EN_TIENDA' ? 0 : 2500
  const totalFinal = total + shipping

  const isSubmitting = ESTADOS_SUBMITTING.has(estado)
  const isPending    = ESTADOS_PENDING.has(estado)
  const isSuccess    = estado === 'success'
  const isFailed     = estado === 'failed'

  async function handleSubmit() {
    const err = validate({ nombre, telefono, needsAddress, direccion })
    if (err) { setError(err); return }
    setError('')

    const notas = buildNotas({ nombre, telefono, direccion, metodo, entrega })

    iniciarPago({
      bodegaId:       BODEGA_DEFAULT,
      metodoEnvio:    entrega,
      notas:          notas || null,
      provider:       metodo,
      items:          items.map(i => ({ productoId: i.id, cantidad: i.cantidad })),
      codigoCupon:    null,
      codigoGiftCard: null,
      ...(token ? {} : {
        guestEmail: email.trim() || null,
        guestPhone: telefono || null,
      }),
    }, !token, metodo === 'SINPE')
  }

  function handleSinpeWhatsApp() {
    openSinpeWhatsApp({ pagoData, items, nombre, telefono, totalFinal })
  }

  if (isPending || isSuccess) {
    return (
      <PosPaymentPendingView
        metodo={metodo}
        isSuccess={isSuccess}
        pagoData={pagoData}
        totalFinal={totalFinal}
        onWhatsApp={handleSinpeWhatsApp}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="space-y-4 py-1">
      <PosPaymentCartSummary items={items} totalFinal={totalFinal} />
      <PosPaymentEntrega entrega={entrega} setEntrega={setEntrega} />
      <PosPaymentMetodo metodo={metodo} setMetodo={setMetodo} />
      <PosPaymentContacto
        nombre={nombre} setNombre={setNombre}
        telefono={telefono} setTelefono={setTelefono}
        email={email} setEmail={setEmail}
        direccion={direccion} setDireccion={setDireccion}
        needsAddress={needsAddress}
      />
      <PosPaymentFooter
        error={error}
        isFailed={isFailed}
        payError={payError}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        itemCount={items.length}
        totalFinal={totalFinal}
      />
    </div>
  )
}
