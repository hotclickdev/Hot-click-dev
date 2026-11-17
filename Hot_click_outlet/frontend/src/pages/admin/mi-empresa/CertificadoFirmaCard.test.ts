import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CertificadoFirmaCard from './CertificadoFirmaCard'
import { MSG_PIN_4_DIGITOS, MSG_PIN_FORMATO, MSG_PIN_VACIO, validarFormatoPin } from './pinCert'

const props = { tieneCert: true, tienePin: false, canEdit: true, onSubirCert: () => {}, onGuardarPin: () => true }

describe('PIN del certificado: formato', () => {
  it('acepta 4 dígitos y 14 caracteres', () => {
    expect(validarFormatoPin('0000')).toBeNull()
    expect(validarFormatoPin('Ab1!Ab1!Ab1!Ab')).toBeNull()
  })

  it('rechaza vacío y en blanco', () => {
    expect(validarFormatoPin('')).toBe(MSG_PIN_VACIO)
    expect(validarFormatoPin('    ')).toBe(MSG_PIN_VACIO)
  })

  it('rechaza longitudes distintas de 4 y 14', () => {
    for (const p of ['123', '12345', '1234567890123', '123456789012345']) {
      expect(validarFormatoPin(p)).toBe(MSG_PIN_FORMATO)
    }
  })

  it('rechaza 4 caracteres que no son todos dígitos', () => {
    expect(validarFormatoPin('abcd')).toBe(MSG_PIN_4_DIGITOS)
    expect(validarFormatoPin('12a4')).toBe(MSG_PIN_4_DIGITOS)
  })
})

describe('CertificadoFirmaCard', () => {
  it('con permiso muestra inputs, el PIN vacío y tipo password', () => {
    const html = renderToStaticMarkup(createElement(CertificadoFirmaCard, props))
    expect(html).toContain('type="password"')
    expect(html).toContain('accept=".p12"')
    expect(html).toContain('falta guardarlo')
    expect(html).toContain('subido')
  })

  it('sin certificado el PIN y el botón quedan deshabilitados', () => {
    const html = renderToStaticMarkup(createElement(CertificadoFirmaCard, { ...props, tieneCert: false }))
    expect(html).toContain('falta subirlo')
    expect(html.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('sin permiso es solo lectura: sin inputs', () => {
    const html = renderToStaticMarkup(createElement(CertificadoFirmaCard, { ...props, canEdit: false, tienePin: true }))
    expect(html).not.toContain('<input')
    expect(html).not.toContain('<button')
    expect(html).toContain('guardado')
  })
})
