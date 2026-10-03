import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Contraste WCAG 2.x de los tokens de color (P19). Mide la paleta de `hotclick-tokens.css`:
 * los pares que pasan quedan fijados y los que no llegan a AA quedan listados como REQUIERE_DECISION
 * (son colores de Figma; no se cambian sin decisión de diseño).
 */
const CSS = readFileSync(new URL('./hotclick-tokens.css', import.meta.url), 'utf8')

function token(nombre: string): string {
  const m = new RegExp(`--${nombre}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS)
  if (!m) throw new Error(`Falta el token --${nombre}`)
  return m[1]
}

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (oscuro + 0.05)
}

const FONDOS = ['hc-n-0', 'hc-n-50', 'hc-n-100']

describe('contraste de tokens (WCAG 2.x)', () => {
  it('el texto principal y secundario pasa AA (4.5:1) sobre blanco, n-50 y n-100', () => {
    for (const texto of ['hc-n-900', 'hc-n-700', 'hc-n-600', 'hc-blue-600', 'hc-link', 'hc-text', 'hc-text-secondary']) {
      for (const fondo of FONDOS) expect(contraste(token(texto), token(fondo)), `${texto} / ${fondo}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('el anillo de foco pasa 3:1 (no texto) sobre los fondos claros', () => {
    for (const fondo of FONDOS) expect(contraste(token('hc-focus-ring'), token(fondo))).toBeGreaterThanOrEqual(3)
  })

  it('el blanco sobre el azul de acción pasa AA', () => {
    expect(contraste(token('hc-n-0'), token('hc-blue-600'))).toBeGreaterThanOrEqual(4.5)
  })

  it('R1: el texto usa n-600, red-600 y --hc-primary-text, que pasan AA sobre los fondos claros', () => {
    for (const texto of ['hc-n-600', 'hc-red-600']) {
      for (const fondo of FONDOS) expect(contraste(token(texto), token(fondo)), `${texto} / ${fondo}`).toBeGreaterThanOrEqual(4.5)
    }
    // Primario como texto en el tema superadmin (#C4181E) y en oscuro (#F0524A sobre #161B22).
    expect(contraste('#C4181E', token('hc-n-0'))).toBeGreaterThanOrEqual(4.5)
    expect(contraste('#F0524A', '#161B22')).toBeGreaterThanOrEqual(4.5)
    expect(CSS).toMatch(/--hc-primary-text:\s*var\(--hc-red-600\)/)
  })

  it('pares por debajo de AA para texto normal: solo quedan en fondos, bordes, íconos y placeholders (decisión R1)', () => {
    const debajo = (a: string, b: string) => contraste(token(a), token(b)) < 4.5
    expect(debajo('hc-n-400', 'hc-n-0')).toBe(true)
    expect(debajo('hc-n-500', 'hc-n-50')).toBe(true)
    expect(debajo('hc-red-500', 'hc-n-0')).toBe(true)
    expect(debajo('hc-success', 'hc-n-0')).toBe(true)
    // n-500 sobre blanco queda justo por encima (4.59:1).
    expect(debajo('hc-n-500', 'hc-n-0')).toBe(false)
  })
})

/** Archivos .ts/.tsx de la app (sin tests ni prototipos). */
function fuentes(dir: URL): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'prototipo' || e.name.includes('.test.')) continue
    const sub = new URL(e.name + (e.isDirectory() ? '/' : ''), dir)
    if (e.isDirectory()) out.push(...fuentes(sub))
    else if (/\.tsx?$/.test(e.name)) out.push(fileURLToPath(sub))
  }
  return out
}

describe('R1: el texto no usa tokens por debajo de AA', () => {
  it('n-400, n-500 y red-500 como texto solo quedan en íconos, placeholders o sobre fondo oscuro', () => {
    const ICONO = /IconoFigma|Glyph|<svg|<[A-Z]\w*Icon\b|<Icon[A-Z]\w*/
    const TEXTO_BAJO = /(?<![\w:-])text-hc-(n-400|n-500|red-500)(?![\w-])/
    // SelfCheckoutFab: texto sobre fondo oscuro. MarcaComprador: logotipo «Hot», exento por WCAG 1.4.3.
    const EXENTOS = ['SelfCheckoutFab.tsx', 'MarcaComprador.tsx']
    const malos: string[] = []
    for (const archivo of fuentes(new URL('../', import.meta.url))) {
      readFileSync(archivo, 'utf8').split('\n').forEach((linea, i) => {
        if (TEXTO_BAJO.test(linea) && !ICONO.test(linea) && !EXENTOS.some((e) => archivo.endsWith(e))) {
          malos.push(`${archivo.replaceAll('\\', '/').split('/src/')[1]}:${i + 1}`)
        }
      })
    }
    expect(malos).toEqual([])
  })
})
