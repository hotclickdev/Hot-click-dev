import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/**
 * QR como imagen PNG. react-qr-code llega como objeto CJS y React 19 tira
 * "Element type is invalid" al montar StepQR — el cajero no ve el código.
 */
export default function PosQrImagen({ value, size, alt }: {
  value: string
  size: number
  alt: string
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => { if (!cancelado) setSrc(url) })
      .catch(() => { if (!cancelado) setSrc(null) })
    return () => { cancelado = true }
  }, [value, size])

  if (!src) {
    return (
      <div
        className="animate-pulse"
        style={{ width: size, height: size, background: '#e5e7eb' }}
        aria-hidden
      />
    )
  }
  return <img src={src} alt={alt} width={size} height={size} />
}
