/** Carga del SDK de Facebook y envoltorios de FB.login con promesas (Embedded Signup y Login for Business). */

export interface FbAuthResponse {
  code?: string
  accessToken?: string
}

interface FbLoginRespuesta {
  authResponse?: FbAuthResponse | null
  status?: string
}

export interface FbSdk {
  init: (o: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void
  login: (cb: (r: FbLoginRespuesta) => void, opts: Record<string, unknown>) => void
}

declare global {
  interface Window {
    FB?: FbSdk
    fbAsyncInit?: () => void
  }
}

const SDK_URL = 'https://connect.facebook.net/es_LA/sdk.js'
let sdkPromise: Promise<FbSdk> | null = null

export function cargarSdkFacebook(appId: string, version: string): Promise<FbSdk> {
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise<FbSdk>((resolve, reject) => {
    window.fbAsyncInit = () => {
      if (!window.FB) {
        sdkPromise = null
        reject(new Error('fb_sdk'))
        return
      }
      window.FB.init({ appId, cookie: false, xfbml: false, version })
      resolve(window.FB)
    }
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onerror = () => {
      sdkPromise = null
      reject(new Error('fb_sdk'))
    }
    document.head.appendChild(script)
  })
  return sdkPromise
}

function login(fb: FbSdk, opts: Record<string, unknown>): Promise<FbAuthResponse> {
  return new Promise<FbAuthResponse>((resolve, reject) => {
    fb.login((r) => {
      if (r.authResponse) resolve(r.authResponse)
      else reject(new Error('fb_cancelado'))
    }, opts)
  })
}

/** Embedded Signup v4: devuelve un código de 5 minutos que solo el servidor puede canjear. */
export function loginEmbeddedSignup(fb: FbSdk, configId: string): Promise<FbAuthResponse> {
  return login(fb, {
    config_id: configId,
    response_type: 'code',
    override_default_response_type: true,
    extras: { setup: {} },
  })
}

/** Facebook Login for Business: la configuración define permisos y tipo de token. */
export function loginParaNegocios(fb: FbSdk, configId: string): Promise<FbAuthResponse> {
  return login(fb, { config_id: configId })
}

export interface SesionEmbebida {
  phoneNumberId: string
  wabaId: string
}

function esOrigenFacebook(origin: string): boolean {
  try {
    const host = new URL(origin).hostname
    return host === 'facebook.com' || host.endsWith('.facebook.com')
  } catch {
    return false
  }
}

function aObjeto(data: unknown): unknown {
  if (typeof data !== 'string') return data
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/** Lee el evento WA_EMBEDDED_SIGNUP (solo si viene de facebook.com) y entrega los ids al terminar el flujo. */
export function interpretarMensajeSignup(origin: string, data: unknown): SesionEmbebida | 'cancelado' | null {
  if (!esOrigenFacebook(origin)) return null
  const m = aObjeto(data) as {
    type?: string
    event?: string
    data?: { phone_number_id?: string; waba_id?: string }
  } | null
  if (m?.type !== 'WA_EMBEDDED_SIGNUP') return null
  if (m.event === 'FINISH' && m.data?.phone_number_id && m.data.waba_id) {
    return { phoneNumberId: m.data.phone_number_id, wabaId: m.data.waba_id }
  }
  return m.event === 'CANCEL' || m.event === 'ERROR' ? 'cancelado' : null
}

/** Espera el evento de sesión de Embedded Signup (llega por postMessage, antes o después del código). */
export function esperarSesionEmbebida(ms = 120_000): { promesa: Promise<SesionEmbebida>; cancelar: () => void } {
  let limpiar: () => void = () => undefined
  const promesa = new Promise<SesionEmbebida>((resolve, reject) => {
    const temporizador = window.setTimeout(() => reject(new Error('signup_tiempo')), ms)
    const escuchar = (e: MessageEvent) => {
      const r = interpretarMensajeSignup(e.origin, e.data)
      if (r === null) return
      window.clearTimeout(temporizador)
      window.removeEventListener('message', escuchar)
      if (r === 'cancelado') reject(new Error('fb_cancelado'))
      else resolve(r)
    }
    window.addEventListener('message', escuchar)
    limpiar = () => {
      window.clearTimeout(temporizador)
      window.removeEventListener('message', escuchar)
    }
  })
  return { promesa, cancelar: () => limpiar() }
}
