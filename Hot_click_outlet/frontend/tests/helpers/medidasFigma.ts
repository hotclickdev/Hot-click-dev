import { expect, type Page } from '@playwright/test'

/** Medidas compartidas por los specs responsive de la migración Figma (P03, P05, P06). */

/** Sin scroll horizontal en el documento. */
export async function sinDesborde(page: Page) {
  const [scroll, cliente] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
  expect(scroll).toBeLessThanOrEqual(cliente)
}

/** Tamaño de letra calculado de los campos visibles que coinciden con `selector`. */
export async function tamanosDeCampos(page: Page, selector: string) {
  return page.evaluate((s) => Array.from(document.querySelectorAll(s))
    .filter((e) => e.getBoundingClientRect().height > 2)
    .map((e) => getComputedStyle(e).fontSize), selector)
}

/** Color que resuelve un token de SHELL, para comparar con el estilo calculado. */
export async function colorDeToken(page: Page, token: string, propiedad: 'color' | 'backgroundColor' = 'color') {
  return page.evaluate(([t, prop]) => {
    const prueba = document.createElement('span')
    prueba.style[prop] = `var(${t})`
    document.body.appendChild(prueba)
    const color = getComputedStyle(prueba)[prop]
    prueba.remove()
    return color
  }, [token, propiedad] as const)
}