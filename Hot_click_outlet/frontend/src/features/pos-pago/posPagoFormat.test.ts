import i18next from 'i18next'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import pt from '@/i18n/locales/pt.json'
import { describe, expect, it } from 'vitest'
import {
  fechaComprobante,
  formatColones,
  inicialesProducto,
  metodoActivo,
  metodosDisponibles,
  nombreItem,
  sinpeNumeroVisible,
  tituloYCodigo,
  VIGENCIA_QR_MINUTOS,
} from './posPagoFormat'

describe('inicialesProducto', () => {
  it('toma hasta dos iniciales', () => {
    expect(inicialesProducto('QA Emprendedor Test 2')).toBe('QE')
    expect(inicialesProducto('Gar')).toBe('G')
    expect(inicialesProducto('  ')).toBe('?')
  })
})

describe('nombreItem y formatColones', () => {
  it('usa nombreProducto de respaldo', () => {
    expect(nombreItem({ nombreProducto: 'Teclado' })).toBe('Teclado')
  })

  it('formatea colones enteros', () => {
    expect(formatColones(60720)).toBe('60.720')
    expect(formatColones(-5)).toBe('0')
  })
})

describe('tituloYCodigo', () => {
  it('separa el SKU entre paréntesis', () => {
    expect(tituloYCodigo('Gar naranja hombre (GAR-8322)')).toEqual({
      titulo: 'Gar naranja hombre',
      codigo: 'GAR-8322',
    })
  })
})

describe('sinpeNumeroVisible', () => {
  it('quita el prefijo +506 y usa el formato único 8888-1234', () => {
    expect(sinpeNumeroVisible('+506 7019-6686')).toBe('7019-6686')
    expect(sinpeNumeroVisible('50670196686')).toBe('7019-6686')
    expect(sinpeNumeroVisible('7019-6686')).toBe('7019-6686')
    expect(sinpeNumeroVisible(undefined)).toBe('')
  })
})

describe('metodosDisponibles', () => {
  it('usa los métodos que habilitó la caja, sin repetir ni desconocidos', () => {
    expect(metodosDisponibles({ metodoPago: 'TARJETA', metodosHabilitados: ['TARJETA', 'SINPE', 'SINPE', 'EFECTIVO'] }))
      .toEqual(['TARJETA', 'SINPE'])
  })
  it('sesión anterior: solo su método', () => {
    expect(metodosDisponibles({ metodoPago: 'SINPE' })).toEqual(['SINPE'])
    expect(metodosDisponibles(null)).toEqual([])
  })
})

describe('metodoActivo', () => {
  it('respeta la elección del cliente si está habilitada', () => {
    expect(metodoActivo(['TARJETA', 'SINPE'], 'TARJETA', 'SINPE')).toBe('SINPE')
    expect(metodoActivo(['TARJETA'], 'TARJETA', 'SINPE')).toBe('TARJETA')
    expect(metodoActivo(['SINPE', 'TARJETA'], undefined, null)).toBe('SINPE')
    expect(metodoActivo([], undefined, null)).toBeNull()
  })
})

describe('fechaComprobante', () => {
  it('formatea la fecha local del servidor', () => {
    expect(fechaComprobante('2026-10-02T15:30:12.5')).toBe('02/10/2026 15:30')
    expect(fechaComprobante(null)).toBe('')
  })
})

describe('vencido: minutos de vigencia del backend (no un número fijo)', () => {
  it('es, en y pt interpolan {{minutos}}', async () => {
    const i18n = i18next.createInstance()
    await i18n.init({ resources: { es: { translation: es }, en: { translation: en }, pt: { translation: pt } }, lng: 'es' })
    expect(i18n.t('pos.pago.vencidoDesc', { minutos: VIGENCIA_QR_MINUTOS })).toContain('duran 30 minutos')
    expect(i18n.t('pos.pago.vencidoDesc', { lng: 'en', minutos: 45 })).toContain('last 45 minutes')
    expect(i18n.t('pos.pago.vencidoDesc', { lng: 'pt', minutos: 30 })).toContain('duram 30 minutos')
    for (const loc of [es, en, pt]) {
      expect(loc.pos.pago.vencidoDesc).toContain('{{minutos}}')
      expect(loc.pos.pago.vencidoDesc).not.toMatch(/\b15\b/)
    }
  })
})
