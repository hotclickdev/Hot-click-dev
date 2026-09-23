type NativeDetectorCtor = new (opts?: { formats?: string[] }) => NativeBarcodeDetector

export type NativeBarcodeDetector = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
  dispose?: () => void
}

export type EscaneoCamaraHandle = {
  detener: () => void
}

type EscaneoCallbacks = {
  onRaw: (raw: string) => void
  isAlive: () => boolean
}

const FORMATOS_NATIVOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] as const

export function preferNativeDetector(
  globalObj: { BarcodeDetector?: NativeDetectorCtor } = window as { BarcodeDetector?: NativeDetectorCtor },
): boolean {
  return typeof globalObj.BarcodeDetector === 'function'
}

function crearDetectorNativo(): NativeBarcodeDetector | null {
  const Detector = (window as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector
  if (!Detector) return null
  return new Detector({ formats: [...FORMATOS_NATIVOS] })
}

function iniciarNativo(
  video: HTMLVideoElement,
  detector: NativeBarcodeDetector,
  callbacks: EscaneoCallbacks,
): EscaneoCamaraHandle {
  let raf = 0

  const tick = async () => {
    if (!callbacks.isAlive()) return
    try {
      if (video.readyState >= 2) {
        const hits = await detector.detect(video)
        const raw = hits[0]?.rawValue ?? ''
        if (raw) callbacks.onRaw(raw)
      }
    } catch {
      /* frame fallido: seguir */
    }
    if (callbacks.isAlive()) {
      raf = requestAnimationFrame(() => { void tick() })
    }
  }

  raf = requestAnimationFrame(() => { void tick() })
  return {
    detener: () => {
      cancelAnimationFrame(raf)
      detector.dispose?.()
    },
  }
}

async function iniciarZxing(
  video: HTMLVideoElement,
  callbacks: EscaneoCallbacks,
): Promise<EscaneoCamaraHandle> {
  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const reader = new BrowserMultiFormatReader()
  const controls = await reader.decodeFromVideoElement(video, (result) => {
    if (!callbacks.isAlive()) return
    const raw = result?.getText() ?? ''
    if (raw) callbacks.onRaw(raw)
  })

  return {
    detener: () => {
      controls?.stop()
    },
  }
}

/** Inicia escaneo nativo o ZXing sobre un video con stream ya activo. */
export async function crearDetectorCamara(
  video: HTMLVideoElement,
  callbacks: EscaneoCallbacks,
): Promise<EscaneoCamaraHandle | null> {
  if (preferNativeDetector()) {
    const detector = crearDetectorNativo()
    if (detector) return iniciarNativo(video, detector, callbacks)
  }

  try {
    return await iniciarZxing(video, callbacks)
  } catch {
    return null
  }
}
