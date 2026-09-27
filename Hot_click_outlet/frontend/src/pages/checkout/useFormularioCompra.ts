import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import { adminService } from '@/services/orderService'
import type { ItemCarrito } from '@/types/carrito'
import type { Id } from '@/types/api'
import { agruparPaquetes, enviosVigentes, requiereDireccion, totalesCompra } from './paquetesCompra'
import { useCupon } from './useCupon'
import { useGiftCardCompra } from './useGiftCardCompra'
import {
  erroresDatos,
  erroresDireccion,
  erroresPago,
  type CampoCompra,
  type DatosCompra,
  type DireccionCompra,
  type ErroresCompra,
  type MetodoPago,
  type PasoCompra,
} from './validacionCompra'

export type FormularioCompra = ReturnType<typeof useFormularioCompra>

/** Con sesión, completa el teléfono del perfil si el cliente todavía no escribió uno. */
function usePrellenarTelefono(token: string | null, userId: Id | null, setDatos: Dispatch<SetStateAction<DatosCompra>>) {
  useEffect(() => {
    if (!token || !userId) return
    let cancelado = false
    adminService.getUsuario(userId).then(({ data }) => {
      const telefono = (data as { data?: { telefono?: string } })?.data?.telefono
      if (cancelado || !telefono) return
      setDatos((previos) => (previos.telefono ? previos : { ...previos, telefono }))
    }).catch(() => { /* prellenado best-effort; el campo queda vacío y editable */ })
    return () => { cancelado = true }
  }, [token, userId, setDatos])
}

/** Datos, dirección, entrega por paquete, método de pago y totales del checkout (Figma `28:1083` a `30:2385`). */
export function useFormularioCompra(items: ItemCarrito[]) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const userId = useAuthStore((s) => s.userId)
  const userEmail = useAuthStore((s) => s.userEmail)
  const userName = useAuthStore((s) => s.userName)

  const [datos, setDatos] = useState<DatosCompra>({ correo: userEmail ?? '', telefono: '', nombre: userName ?? '' })
  const [direccion, setDireccion] = useState<DireccionCompra>({ provincia: '', canton: '', senas: '' })
  const [elegidos, setElegidos] = useState<Record<string, string>>({})
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('SINPE')
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [aceptaDatos, setAceptaDatos] = useState(false)
  const [errores, setErrores] = useState<ErroresCompra>({})
  usePrellenarTelefono(token, userId, setDatos)

  const cupon = useCupon()
  const giftCard = useGiftCardCompra(token)
  const paquetes = useMemo(() => agruparPaquetes(items), [items])
  const envios = useMemo(() => enviosVigentes(paquetes, elegidos), [paquetes, elegidos])
  const efectivoDisponible = !requiereDireccion(envios)
  const metodoVigente: MetodoPago = metodoPago === 'EFECTIVO' && !efectivoDisponible ? 'SINPE' : metodoPago
  const totales = totalesCompra(paquetes, envios, cupon.cupon, giftCard.aplicada)

  function limpiarError(campo: CampoCompra) {
    setErrores((previos) => (previos[campo] ? { ...previos, [campo]: undefined } : previos))
  }

  function cambiarDato(campo: keyof DatosCompra, valor: string) {
    setDatos((previos) => ({ ...previos, [campo]: valor }))
    limpiarError(campo)
  }

  function cambiarDireccion(campo: keyof DireccionCompra, valor: string) {
    setDireccion((previa) => (campo === 'provincia' ? { ...previa, provincia: valor, canton: '' } : { ...previa, [campo]: valor }))
    limpiarError(campo)
  }

  function elegirComprobante(archivo: File | null) {
    setComprobante(archivo)
    limpiarError('comprobante')
  }

  function erroresDelPaso(paso: PasoCompra): ErroresCompra {
    if (paso === 1) return erroresDatos(datos, t)
    if (paso === 2) return erroresDireccion(direccion, envios, t)
    return erroresPago(metodoVigente, comprobante, t)
  }

  /** Marca los errores de los pasos pedidos y devuelve el primero que falla, o `null`. */
  function validarPasos(pasos: PasoCompra[]): PasoCompra | null {
    const revisados = pasos.map((paso) => ({ paso, errores: erroresDelPaso(paso) }))
    setErrores(Object.assign({}, ...revisados.map((r) => r.errores)))
    return revisados.find((r) => Object.keys(r.errores).length > 0)?.paso ?? null
  }

  return {
    token,
    datos,
    cambiarDato,
    direccion,
    cambiarDireccion,
    paquetes,
    envios,
    elegirEnvio: (clave: string, metodo: string) => setElegidos((previos) => ({ ...previos, [clave]: metodo })),
    metodoPago: metodoVigente,
    setMetodoPago,
    efectivoDisponible,
    comprobante,
    elegirComprobante,
    aceptaDatos,
    setAceptaDatos,
    errores,
    validarPasos,
    cupon,
    giftCard,
    totales,
  }
}
