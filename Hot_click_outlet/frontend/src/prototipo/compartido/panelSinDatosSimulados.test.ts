import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ConsultasPage from './ConsultasPage'
import NotificacionesPage from './NotificacionesPage'
import NotificacionesEmprendedorPage from '../emprendedor/pages/NotificacionesPage'
import { PLAN_EMPRENDEDOR, PLAN_NEGOCIO_PLUS, PLAN_PYME } from './plan'
import { SellerPlanProvider } from './SellerPlanContext'

const TEXTOS_SIMULADOS = ['₡', 'Falló tu cobro', 'Auriculares', 'Camiseta Oversize', 'Cargador USB-C']

function renderizar(pagina: ComponentType, plan = PLAN_PYME): string {
  const contenido = createElement(SellerPlanProvider, { plan, children: createElement(pagina) })
  return renderToStaticMarkup(createElement(StaticRouter, { location: '/', children: contenido }))
}

function esperarSinSimulados(html: string) {
  for (const texto of TEXTOS_SIMULADOS) {
    expect(html).not.toContain(texto)
  }
}

describe('Panel del vendedor sin datos simulados (D2-04)', () => {
  it.each([PLAN_EMPRENDEDOR, PLAN_PYME, PLAN_NEGOCIO_PLUS])('Notificaciones compartida ($id) no muestra montos ni avisos fijos', (plan) => {
    const html = renderizar(NotificacionesPage, plan)
    esperarSinSimulados(html)
    expect(html).toContain('Todavía no tenés notificaciones')
  })

  it('Notificaciones de Emprendedor no muestra montos ni avisos fijos', () => {
    const html = renderizar(NotificacionesEmprendedorPage, PLAN_EMPRENDEDOR)
    esperarSinSimulados(html)
    expect(html).toContain('Todavía no tenés notificaciones')
  })

  it.each([PLAN_PYME, PLAN_NEGOCIO_PLUS])('Consultas ($id) no muestra montos ni conversaciones fijas', (plan) => {
    const html = renderizar(ConsultasPage, plan)
    esperarSinSimulados(html)
    expect(html).toContain('Todavía no tenés consultas')
  })
})
