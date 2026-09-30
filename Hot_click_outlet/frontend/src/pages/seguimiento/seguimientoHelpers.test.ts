import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import pt from '@/i18n/locales/pt.json'
import {
  CLASES_TONO,
  ESTADOS_CONOCIDOS,
  claveEstado,
  contarEntregados,
  formatearFecha,
  lineaGuia,
  seguimientoDesdeRespuesta,
  tokenConFormatoValido,
  tonoDeEstado,
  urlSegura,
} from './seguimientoHelpers'

const TOKEN = 'a'.repeat(64)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('seguimiento de pedido sin cuenta — helpers', () => {
  it('solo consulta tokens de 64 hex (nunca un id numérico ni el número de pedido)', () => {
    expect(tokenConFormatoValido(TOKEN)).toBe(true)
    expect(tokenConFormatoValido('123')).toBe(false)
    expect(tokenConFormatoValido('ORD-10482')).toBe(false)
    expect(tokenConFormatoValido('A'.repeat(64))).toBe(false)
    expect(tokenConFormatoValido(undefined)).toBe(false)
  })

  it('colorea los estados como el Figma: enviado azul, preparación aviso, entregado éxito', () => {
    expect(tonoDeEstado('ENVIADO')).toBe('info')
    expect(tonoDeEstado('EN_PREPARACION')).toBe('aviso')
    expect(tonoDeEstado('ENTREGADO')).toBe('exito')
    expect(tonoDeEstado('ALGO_NUEVO')).toBe('neutro')
    expect(Object.values(CLASES_TONO).join(' ')).not.toMatch(/#[0-9a-f]{3,6}/i)
  })

  it('un estado desconocido no muestra el código interno', () => {
    expect(claveEstado('ALGO_NUEVO')).toBe('comprador.seguimiento.estado.otro')
    expect(claveEstado('ENVIADO')).toBe('comprador.seguimiento.estado.ENVIADO')
  })

  it('línea de guía: Correos CR con enlace, sin guía, entregado con fecha, retiro y cancelado', () => {
    const conGuia = lineaGuia({ estado: 'ENVIADO', numeroGuia: 'RR123456789CR', courier: 'CORREOS_CR',
      urlRastreo: 'https://rastreo.correos.go.cr/?codigo=RR123456789CR' }, 'es')
    expect(conGuia).toMatchObject({ icono: 'camion', clave: 'comprador.seguimiento.guiaCorreos',
      valores: { guia: 'RR123456789CR' } })
    expect(conGuia.urlRastreo).toContain('rastreo.correos.go.cr')

    expect(lineaGuia({ estado: 'EN_PREPARACION' }, 'es'))
      .toMatchObject({ icono: 'caja', clave: 'comprador.seguimiento.sinGuia', urlRastreo: null })

    expect(lineaGuia({ estado: 'ENTREGADO', numeroGuia: 'RR987654321CR', fechaEntrega: '2026-09-24' }, 'es'))
      .toMatchObject({ icono: 'camion', clave: 'comprador.seguimiento.entregadoElConGuia',
        valores: { fecha: '24 sep', guia: 'RR987654321CR' }, urlRastreo: null })

    expect(lineaGuia({ estado: 'LISTO_RETIRO', retiroEnTienda: true }, 'es').clave)
      .toBe('comprador.seguimiento.listoRetiro')
    expect(lineaGuia({ estado: 'CANCELADO', numeroGuia: 'X' }, 'es').clave).toBe('comprador.seguimiento.cancelado')
  })

  it('descarta enlaces de rastreo que no son https', () => {
    expect(urlSegura('javascript:alert(1)')).toBeNull()
    expect(urlSegura('http://x.cr')).toBeNull()
    expect(urlSegura('no es url')).toBeNull()
    expect(urlSegura('https://rastreo.correos.go.cr/?codigo=1')).toBe('https://rastreo.correos.go.cr/?codigo=1')
    expect(lineaGuia({ estado: 'ENVIADO', numeroGuia: 'G1', urlRastreo: 'javascript:alert(1)' }, 'es').urlRastreo).toBeNull()
  })

  it('fecha corta del Figma sin correrse por zona horaria', () => {
    expect(formatearFecha('2026-09-26T10:30:00', 'es')).toBe('26 sep 2026')
    expect(formatearFecha('2026-09-24', 'es', false)).toBe('24 sep')
    expect(formatearFecha('2026-09-26', 'en')).toBe('26 Sep 2026')
    expect(formatearFecha('basura', 'es')).toBe('')
  })

  it('cuenta entregados y desenvuelve la respuesta; formas raras = no encontrado', () => {
    expect(contarEntregados([{ estado: 'ENTREGADO' }, { estado: 'ENVIADO' }, { estado: 'ENTREGADO' }])).toBe(2)
    const pedido = seguimientoDesdeRespuesta({ success: true, data: { numeroPedido: 'ORD-1', paquetes: [{ estado: 'ENVIADO' }, null] } })
    expect(pedido?.numeroPedido).toBe('ORD-1')
    expect(pedido?.paquetes).toHaveLength(1)
    expect(seguimientoDesdeRespuesta({ success: false, message: 'x' })).toBeNull()
    expect(seguimientoDesdeRespuesta(null)).toBeNull()
  })
})

describe('seguimiento de pedido sin cuenta — i18n y wiring', () => {
  const locales = { es, en, pt } as Record<string, { comprador: { seguimiento: Record<string, unknown> } }>

  it('es/en/pt tienen las mismas claves y todos los estados conocidos', () => {
    const claves = (o: Record<string, unknown>, p = ''): string[] => Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === 'object' ? claves(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`])
    const base = claves(locales.es.comprador.seguimiento).sort()
    expect(claves(locales.en.comprador.seguimiento).sort()).toEqual(base)
    expect(claves(locales.pt.comprador.seguimiento).sort()).toEqual(base)
    for (const estado of ESTADOS_CONOCIDOS) expect(base).toContain(`estado.${estado}`)
  })

  it('ruta pública /seguimiento/:token registrada en el router y en el SpaController', () => {
    const rutas = readFileSync(resolve(root, 'src/app/AppRoutes.tsx'), 'utf8')
    expect(rutas).toContain('path="/seguimiento/:token"')
    expect(rutas).toContain('SeguimientoPedidoPage')
    const spa = readFileSync(resolve(root, '../src/main/java/com/hotclick/controller/SpaController.java'), 'utf8')
    expect(spa).toContain('"/seguimiento/{token}"')
  })

  it('la página no usa emojis ni colores hardcodeados y marca noindex', () => {
    const archivos = ['src/pages/SeguimientoPedidoPage.tsx', 'src/pages/seguimiento/PaqueteSeguimientoCard.tsx']
    for (const archivo of archivos) {
      const fuente = readFileSync(resolve(root, archivo), 'utf8')
      expect(fuente).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(fuente).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
    }
    expect(readFileSync(resolve(root, 'src/pages/SeguimientoPedidoPage.tsx'), 'utf8')).toContain('noindex')
  })
})
