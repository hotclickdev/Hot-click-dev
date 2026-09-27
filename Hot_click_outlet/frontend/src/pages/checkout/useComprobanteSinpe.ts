import { useCallback, useEffect, useRef, useState } from 'react'
import { ejecutarSinpeWhatsApp, ejecutarSubirComprobante } from './ejecutarSubirComprobante'
import type { DatosCompra } from './validacionCompra'

type PagoDataComprobante = {
  numeroPedido?: string
  proveedor?: string
}

type ComprobanteSinpeDeps = {
  estado: string
  pagoData: PagoDataComprobante | null
  token: string | null
  datos: DatosCompra
  /** Archivo elegido en el paso de pago, antes de crear el pedido. */
  comprobante: File | null
  total: number
}

/**
 * Sube solo el comprobante elegido en el pago apenas existe el pedido SINPE.
 * Si falla, la pantalla pendiente permite elegir otro archivo y reintentar.
 */
export function useComprobanteSinpe({ estado, pagoData, token, datos, comprobante, total }: ComprobanteSinpeDeps) {
  const [otroArchivo, setOtroArchivo] = useState<File | null>(null)
  const [imagenErr, setImagenErr] = useState('')
  const [subida, setSubida] = useState('idle')
  const [errorSubida, setErrorSubida] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const subidaAutomatica = useRef(false)
  const archivo = otroArchivo ?? comprobante

  const subir = useCallback(async () => {
    await ejecutarSubirComprobante({
      sinpeImagen: archivo,
      sinpeNombre: datos.nombre,
      sinpeCedula: '',
      sinpeTelefono: datos.telefono,
      pagoData,
      token,
      sinpeEmail: '',
      guestEmail: datos.correo,
      setSinpeImagenErr: setImagenErr,
      setSinpeUploadEstado: setSubida,
      setSinpeUploadError: setErrorSubida,
    })
  }, [archivo, datos, pagoData, token])

  useEffect(() => {
    if (estado !== 'sinpe_pendiente' || pagoData?.proveedor === 'EFECTIVO' || !comprobante) return
    if (subidaAutomatica.current) return
    subidaAutomatica.current = true
    void subir()
  }, [estado, pagoData, comprobante, subir])

  const whatsapp = useCallback(() => {
    ejecutarSinpeWhatsApp({ pagoData, sinpeNombre: datos.nombre, sinpeCedula: '', sinpeTelefono: datos.telefono, totalFinal: total })
  }, [pagoData, datos, total])

  return {
    archivo,
    setOtroArchivo,
    imagenErr,
    setImagenErr,
    subida,
    setSubida,
    errorSubida,
    setErrorSubida,
    inputRef,
    subir,
    whatsapp,
  }
}
