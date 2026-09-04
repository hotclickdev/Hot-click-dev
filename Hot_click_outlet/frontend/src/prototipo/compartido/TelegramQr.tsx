import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** QR del deep link de vinculación (el bot no puede escribir primero). */
export default function TelegramQr({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    QRCode.toDataURL(value, { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then((url) => { if (vivo) setSrc(url) })
      .catch(() => { if (vivo) setSrc(null) })
    return () => { vivo = false }
  }, [value])

  if (!src) {
    return <div className="size-[140px] animate-pulse rounded-xl bg-hc-surface-2" aria-hidden />
  }
  return (
    <img
      src={src}
      alt="Código QR para abrir el bot de Telegram"
      width={140}
      height={140}
      className="rounded-xl border border-hc-border bg-hc-surface p-1.5"
    />
  )
}
