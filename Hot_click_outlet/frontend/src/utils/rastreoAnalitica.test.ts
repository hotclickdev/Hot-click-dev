import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { consentDesdeCategorias, setCookieConsent } from './cookieConsent'
import { sincronizarRastreoConConsentimiento } from './rastreoAnalitica'
import { getOrCreateVisitorId } from './visitorId'
import { captureAttributionFromLocation } from './attribution'
import { trackAiPage } from '@/components/ai/aiChat/aiChatBehavior'

/** Tarro de cookies mínimo: respeta Max-Age=0 / max-age=0 como borrado. */
function tarroCookies() {
  const jar = new Map<string, string>()
  return {
    jar,
    get cookie() { return [...jar].map(([k, v]) => `${k}=${v}`).join('; ') },
    set cookie(linea: string) {
      const [par, ...attrs] = linea.split(';')
      const i = par.indexOf('=')
      const nombre = par.slice(0, i).trim()
      if (attrs.some((a) => /^\s*max-age=0\s*$/i.test(a))) jar.delete(nombre)
      else jar.set(nombre, par.slice(i + 1))
    },
  }
}

function almacenamiento() {
  const m = new Map<string, string>()
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
    removeItem: (k: string) => { m.delete(k) },
  }
}

let doc: ReturnType<typeof tarroCookies>
let ls: ReturnType<typeof almacenamiento>
let bus: EventTarget

beforeEach(() => {
  doc = tarroCookies()
  ls = almacenamiento()
  bus = new EventTarget()
  vi.stubGlobal('document', doc)
  vi.stubGlobal('localStorage', ls)
  vi.stubGlobal('location', { protocol: 'https:', search: '', pathname: '/' })
  vi.stubGlobal('addEventListener', bus.addEventListener.bind(bus))
  vi.stubGlobal('removeEventListener', bus.removeEventListener.bind(bus))
  vi.stubGlobal('dispatchEvent', bus.dispatchEvent.bind(bus))
})
afterEach(() => { vi.unstubAllGlobals() })

const generar = () => {
  getOrCreateVisitorId()
  captureAttributionFromLocation('?utm_source=ig&utm_campaign=oct', '/')
  trackAiPage('home')
}
const nombres = () => [...doc.jar.keys()].sort()

describe('rastreo de analítica según consentimiento', () => {
  it('sin consentimiento no crea cookies ni la clave de atribución', () => {
    generar()
    expect(getOrCreateVisitorId()).toBeNull()
    expect(nombres()).toEqual([])
    expect(ls.getItem('hotclick-attribution')).toBeNull()
  })

  it('con análisis aceptado crea las tres cookies y la clave', () => {
    setCookieConsent(consentDesdeCategorias(true, false))
    generar()
    expect(nombres()).toEqual(['hc_ai_beh', 'hc_attr', 'hotclick_visitor_id'])
    expect(ls.getItem('hotclick-attribution')).not.toBeNull()
  })

  it('al pasar a «Solo esenciales» las borra; con consentimiento posterior arranca desde ahí', () => {
    const desuscribir = sincronizarRastreoConConsentimiento()
    setCookieConsent(consentDesdeCategorias(true, false))
    generar()
    doc.cookie = 'otra=1; Path=/'
    setCookieConsent(consentDesdeCategorias(false, false))
    expect(nombres()).toEqual(['otra'])
    expect(ls.getItem('hotclick-attribution')).toBeNull()
    generar()
    expect(nombres()).toEqual(['otra'])
    setCookieConsent(consentDesdeCategorias(true, false))
    expect(nombres()).toEqual(['otra'])
    trackAiPage('home')
    expect(nombres()).toEqual(['hc_ai_beh', 'otra'])
    desuscribir()
  })

  it('al iniciar sin consentimiento borra lo que haya quedado de antes', () => {
    doc.cookie = 'hc_attr=x; Path=/'
    doc.cookie = 'hotclick_visitor_id=y; Path=/'
    ls.setItem('hotclick-attribution', '{}')
    sincronizarRastreoConConsentimiento()()
    expect(nombres()).toEqual([])
    expect(ls.getItem('hotclick-attribution')).toBeNull()
  })
})
