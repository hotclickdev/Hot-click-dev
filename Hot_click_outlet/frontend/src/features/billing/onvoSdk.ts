import type { CSSProperties } from 'react'

const ONVO_SDK_URL = 'https://sdk.onvopay.com/sdk.js'

export type OnvoPayInstance = {
  render: (selector: string) => void
  submitPayment: () => void
}

/**
 * El Web SDK de ONVO renderiza un iframe siempre claro (sin theme/dark en la API).
 * Pad claro alrededor para que no choque con shells html.dark.
 */
export const ESTILO_PAD_ONVO: CSSProperties = {
  borderColor: '#e5e7eb',
  background: '#ffffff',
  colorScheme: 'light',
}

type OnvoGlobal = {
  pay: (opts: {
    publicKey: string
    paymentIntentId?: string
    subscriptionId?: string
    customerId?: string
    paymentType: 'one_time' | 'subscription'
    locale?: string
    manualSubmit?: boolean
    onSuccess: (data: unknown) => void
    onError: (data: { message?: string }) => void
  }) => OnvoPayInstance
}

declare global {
  interface Window {
    onvo?: OnvoGlobal
  }
}

let sdkPromise: Promise<void> | null = null

export function cargarSdkOnvo(): Promise<void> {
  if (window.onvo) return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = ONVO_SDK_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('onvo_sdk'))
    document.head.appendChild(script)
  })
  return sdkPromise
}

export const ONVO_PUBLISHABLE_ENV = import.meta.env.VITE_ONVO_PUBLISHABLE_KEY as string | undefined
