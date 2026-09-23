import { useEffect, useRef, useState } from 'react'
import { crearDetectorCamara } from './barcodeCameraDetector'
import { normalizarCodigoBarras } from './barcodeHid'

type Props = {
  onScan: (codigo: string) => void
  onClose: () => void
}

const ERROR_CAMARA = 'No se pudo abrir la cámara. Revisá el permiso o usá la pistola.'
const ERROR_DETECTOR = 'Tu navegador no puede leer códigos con la cámara. Usá la pistola Bluetooth.'

/**
 * Cámara fullscreen: BarcodeDetector nativo (Chrome) o ZXing en Android sin API nativa.
 * Un solo código válido; callbacks vía ref para no reiniciar el stream.
 */
export default function BarcodeCameraScan({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const alive = useRef(true)
  const cerrado = useRef(false)
  const onScanRef = useRef(onScan)
  const onCloseRef = useRef(onClose)
  onScanRef.current = onScan
  onCloseRef.current = onClose

  useEffect(() => {
    alive.current = true
    cerrado.current = false
    let escaneo: { detener: () => void } | null = null

    function liberarCamara() {
      escaneo?.detener()
      escaneo = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (!alive.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()

        escaneo = await crearDetectorCamara(video, {
          isAlive: () => alive.current && !cerrado.current,
          onRaw: (raw) => {
            if (cerrado.current) return
            const code = normalizarCodigoBarras(raw)
            if (!code) return
            cerrado.current = true
            liberarCamara()
            onScanRef.current(code)
            onCloseRef.current()
          },
        })
        if (!escaneo && alive.current) {
          liberarCamara()
          setError(ERROR_DETECTOR)
        }
      } catch {
        if (alive.current) {
          liberarCamara()
          setError(ERROR_CAMARA)
        }
      }
    }

    void iniciar()
    return () => {
      alive.current = false
      liberarCamara()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#000' }}>
      <div className="flex items-center justify-between p-3">
        <p className="text-sm text-white font-semibold">Escanear con cámara</p>
        <button type="button" onClick={onClose} className="text-white text-sm px-3 py-1 rounded-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
          Cerrar
        </button>
      </div>
      {error ? (
        <p className="text-center text-sm text-red-300 p-6">{error}</p>
      ) : (
        <video ref={videoRef} className="flex-1 w-full object-cover" playsInline muted />
      )}
      <p className="text-center text-xs text-white/70 p-3">
        Centrá el código de barras. Mejor luz o acercá el código. Si no detecta, usá la pistola Bluetooth.
      </p>
    </div>
  )
}
