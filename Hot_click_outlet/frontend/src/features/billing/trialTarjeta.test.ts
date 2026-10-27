import { describe, expect, it } from 'vitest'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import { ESTADO_PLAN_PENDIENTE_CUPO, esperandoCupo } from '@/services/emprendeCupoService'
import type { TrialTarjetaEstado } from '@/services/billingService'
import {
  debeConsultarTarjeta,
  estadoHttp,
  formatoUsd,
  mensajeErrorTarjeta,
  mostrarBotonAgregarTarjeta,
  vistaTarjetaTrial,
  type EntradaVista,
} from './trialTarjeta'

const sinTarjeta: TrialTarjetaEstado = { elegible: true, tarjetaGuardada: false, trialDias: 40 }
const conTarjeta: TrialTarjetaEstado = { elegible: true, tarjetaGuardada: true, trialDias: 40 }

function entrada(parcial: Partial<EntradaVista>): EntradaVista {
  return { estadoPlan: 'TRIAL', trialDias: 40, estado: sinTarjeta, cargando: false, errorVerificacion: false, ...parcial }
}

describe('Trial Emprendedor: botón «Agregar tarjeta»', () => {
  it('se muestra en TRIAL sin tarjeta guardada, con los días que quedan', () => {
    const v = vistaTarjetaTrial(entrada({}))
    expect(v).toEqual({ tipo: 'agregar', dias: 40 })
    expect(mostrarBotonAgregarTarjeta(v)).toBe(true)
  })

  it('se oculta cuando la tarjeta ya está guardada y pasa a «guardada»', () => {
    const v = vistaTarjetaTrial(entrada({ estado: conTarjeta }))
    expect(v).toEqual({ tipo: 'guardada', dias: 40 })
    expect(mostrarBotonAgregarTarjeta(v)).toBe(false)
  })

  it('usa los días del servidor y, si faltan, los de /tenant/info; nunca negativos ni NaN', () => {
    expect(vistaTarjetaTrial(entrada({ estado: { ...sinTarjeta, trialDias: 5 }, trialDias: 40 }))).toEqual({ tipo: 'agregar', dias: 5 })
    expect(vistaTarjetaTrial(entrada({ estado: { ...sinTarjeta, trialDias: -1 }, trialDias: 12 }))).toEqual({ tipo: 'agregar', dias: 12 })
    expect(vistaTarjetaTrial(entrada({ estado: { ...sinTarjeta, trialDias: Number.NaN }, trialDias: -1 }))).toEqual({ tipo: 'agregar', dias: 0 })
  })

  it('sin elegibilidad del servidor no hay botón (otro negocio, trial vencido, suspendido)', () => {
    const v = vistaTarjetaTrial(entrada({ estado: { elegible: false, tarjetaGuardada: false, trialDias: 0 } }))
    expect(v).toEqual({ tipo: 'oculta' })
    expect(mostrarBotonAgregarTarjeta(v)).toBe(false)
  })

  it.each(['ACTIVO', 'PAST_DUE', 'VENCIDO', 'REQUIERE_MEMBRESIA', 'PRUEBA_CERRADA', '', null, undefined])(
    'con estadoPlan %s no hay botón aunque el servidor dijera elegible', (estadoPlan) => {
      expect(mostrarBotonAgregarTarjeta(vistaTarjetaTrial(entrada({ estadoPlan })))).toBe(false)
      expect(debeConsultarTarjeta(estadoPlan)).toBe(false)
    })

  it('mientras carga no hay botón; si la verificación falla tampoco (fail-closed, sin «guardada» ni «sin tarjeta»)', () => {
    expect(vistaTarjetaTrial(entrada({ cargando: true, estado: null }))).toEqual({ tipo: 'cargando' })
    const fallo = vistaTarjetaTrial(entrada({ estado: null, errorVerificacion: true }))
    expect(fallo.tipo).toBe('no_verificable')
    expect(mostrarBotonAgregarTarjeta(fallo)).toBe(false)
    // aun con un estado viejo en memoria, un error de verificación manda
    expect(vistaTarjetaTrial(entrada({ estado: conTarjeta, errorVerificacion: true })).tipo).toBe('no_verificable')
  })

  it('sin respuesta del servidor (403 del no propietario) no se muestra nada', () => {
    expect(vistaTarjetaTrial(entrada({ estado: null }))).toEqual({ tipo: 'oculta' })
  })
})

describe('PENDIENTE_CUPO (#419)', () => {
  it('el helper reconoce solo el estado exacto', () => {
    expect(ESTADO_PLAN_PENDIENTE_CUPO).toBe('PENDIENTE_CUPO')
    expect(esperandoCupo('PENDIENTE_CUPO')).toBe(true)
    expect(esperandoCupo('TRIAL')).toBe(false)
    expect(esperandoCupo(null)).toBe(false)
  })

  it('el negocio que espera cupo ve el aviso de espera, sin días ni botón, y no consulta la tarjeta', () => {
    const v = vistaTarjetaTrial(entrada({ estadoPlan: 'PENDIENTE_CUPO', trialDias: -1, estado: null }))
    expect(v).toEqual({ tipo: 'espera_cupo' })
    expect(mostrarBotonAgregarTarjeta(v)).toBe(false)
    expect(debeConsultarTarjeta('PENDIENTE_CUPO')).toBe(false)
  })

  it('un estado viejo con elegible=true no habilita el botón en PENDIENTE_CUPO', () => {
    expect(mostrarBotonAgregarTarjeta(vistaTarjetaTrial(entrada({ estadoPlan: 'PENDIENTE_CUPO', estado: sinTarjeta })))).toBe(false)
  })
})

describe('Ayudas de texto y errores', () => {
  it('formatoUsd muestra US$ y no inventa un precio si falta', () => {
    expect(formatoUsd(9)).toBe('US$9')
    expect(formatoUsd(9.5)).toBe('US$9.50')
    expect(formatoUsd(null)).toBeNull()
    expect(formatoUsd(0)).toBeNull()
    expect(formatoUsd(Number.NaN)).toBeNull()
  })

  it('mensajeErrorTarjeta usa el texto del servidor o el de respaldo, nunca un objeto', () => {
    expect(mensajeErrorTarjeta({ response: { data: { error: 'Ahora no podés agregar la tarjeta.' } } }, 'x')).toBe('Ahora no podés agregar la tarjeta.')
    expect(mensajeErrorTarjeta({ response: { data: { error: { raw: 1 } } } }, 'respaldo')).toBe('respaldo')
    expect(mensajeErrorTarjeta(null, 'respaldo')).toBe('respaldo')
    expect(estadoHttp({ response: { status: 403 } })).toBe(403)
    expect(estadoHttp(new Error('x'))).toBeNull()
  })
})

describe('Textos de trialTarjeta', () => {
  const t = es.trialTarjeta as Record<string, unknown>

  it('existen todas las claves que usa la UI en es y en', () => {
    const claves = ['titulo', 'cargando', 'dias_one', 'dias_other', 'quedan', 'sinCobro', 'sinCobroConMonto', 'agregar', 'preparando',
      'guardar', 'cancelar', 'confirmando', 'sinConfirmar', 'verificarDeNuevo', 'reintentar', 'noVerificable', 'errorGenerico',
      'errorIniciar', 'guardada', 'simulada', 'esperaCupo', 'banner']
    for (const c of claves) {
      expect(t[c], `es.${c}`).toBeTruthy()
      expect((en.trialTarjeta as Record<string, unknown>)[c], `en.${c}`).toBeTruthy()
    }
  })

  it('el español usa voseo costarricense y moneda en US$ (nada de tuteo)', () => {
    const planos = JSON.stringify(es.trialTarjeta)
    expect(planos).toMatch(/Agregá|Probá|revisá/)
    expect(planos).not.toMatch(/\b(Agrega|Prueba|Revisa|tienes|puedes|quieres)\b/)
    expect(planos).not.toMatch(/₡|\$\s?\d/)
    expect(String(t.sinCobroConMonto)).toContain('{{monto}}')
  })
})
