import { describe, expect, it } from 'vitest'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import { ToastProvider } from '@/components/ui/Toast'
import BotPage from './BotPage'
import ConfiguracionTab from './ConfiguracionTab'
import ConocimientoTab from './ConocimientoTab'
import CanalesTab from './CanalesTab'
import EquipoPinTab from './EquipoPinTab'
import SimuladorTab from './SimuladorTab'
import LeadsTab from './LeadsTab'
import UsoMes from './UsoMes'
import { CLAVE_BOT } from './useBot'
import type { UsoBot, CanalBot, ConfigBot, Conocimiento, EstadoVinculacion, Lead } from './botTypes'

const config: ConfigBot = {
  nombreBot: 'Tina', trato: 'TUTEO', emojis: true, activo: true, horarioActivo: true, zona: 'America/Costa_Rica',
  mensajeFueraHorario: 'Volvemos mañana',
  horario: [
    { dia: 'LUNES', abierto: true, desde: '08:00', hasta: '17:00' },
    { dia: 'MARTES', abierto: false, desde: '08:00', hasta: '17:00' },
  ],
}

function pantalla(el: ReactElement, semillas: Array<[readonly unknown[], unknown]> = []): string {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  for (const [clave, dato] of semillas) qc.setQueryData([...CLAVE_BOT, ...clave], dato)
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client: qc }, createElement(ToastProvider, null, el)),
  )
}

describe('panel del bot: pestañas', () => {
  it('es un tablist accesible con las seis secciones y solo la activa en el orden de tabulación', () => {
    const html = pantalla(createElement(BotPage))
    expect(html).toContain('role="tablist"')
    expect((html.match(/role="tab"/g) ?? []).length).toBe(7)
    expect(html).toContain('aria-selected="true"')
    expect((html.match(/tabindex="-1"/g) ?? []).length).toBe(6)
    expect(html).toContain('role="tabpanel"')
    for (const t of ['Configuración', 'Conocimiento', 'Canales', 'Equipo y PIN', 'Simulador', 'Leads']) {
      expect(html).toContain(t)
    }
  })
})

describe('panel del bot: configuración', () => {
  it('muestra el nombre, el trato y el horario con etiquetas por día y en voseo', () => {
    const html = pantalla(createElement(ConfiguracionTab), [[['config'], config]])
    expect(html).toContain('value="Tina"')
    expect(html).toContain('Lunes')
    expect(html).toContain('Lunes: abre a las')
    expect(html).toContain('Volvemos mañana')
    expect(html).toContain('America/Costa_Rica')
    expect(html).toContain('Guardar cambios')
  })

  it('sin horario activo no muestra los días ni el mensaje', () => {
    const html = pantalla(createElement(ConfiguracionTab), [[['config'], { ...config, horarioActivo: false }]])
    expect(html).not.toContain('Lunes')
    expect(html).not.toContain('Mensaje fuera de horario')
  })

  it('mientras carga avisa con role status', () => {
    expect(pantalla(createElement(ConfiguracionTab))).toContain('role="status"')
  })
})

describe('panel del bot: conocimiento', () => {
  const k: Conocimiento = { id: 1, titulo: 'Envíos', contenido: 'Enviamos a todo el país', categoria: 'Logística', activo: true }

  it('lista las entradas con botones que nombran la entrada', () => {
    const html = pantalla(createElement(ConocimientoTab), [[['conocimiento'], [k]]])
    expect(html).toContain('Envíos')
    expect(html).toContain('Logística')
    expect(html).toContain('aria-label="Editar Envíos"')
    expect(html).toContain('aria-label="Eliminar Envíos"')
  })

  it('sin entradas muestra el estado vacío', () => {
    expect(pantalla(createElement(ConocimientoTab), [[['conocimiento'], []]])).toContain('Todavía no hay conocimiento')
  })
})

describe('panel del bot: canales', () => {
  const activa: CanalBot = { id: 1, tipo: 'WHATSAPP', nombre: 'Tienda', estado: 'ACTIVA', tieneToken: true }
  const pausada: CanalBot = { id: 2, tipo: 'INSTAGRAM', nombre: null, estado: 'PAUSADA', tieneToken: true }
  const fuera: CanalBot = { id: 3, tipo: 'MESSENGER', nombre: 'Viejo', estado: 'DESCONECTADA', tieneToken: false }

  it('ofrece pausar a la activa, reanudar a la pausada y nada a la desconectada', () => {
    const html = pantalla(createElement(CanalesTab), [[['canales'], [activa, pausada, fuera]]])
    expect(html).toContain('Pausar')
    expect(html).toContain('Reanudar')
    expect(html).toContain('aria-label="Desconectar Tienda"')
    expect(html).not.toContain('Desconectar Viejo')
  })
})

describe('panel del bot: equipo y PIN', () => {
  const v: EstadoVinculacion = { vinculado: true, telefonoTerminaEn: '1234', tienePin: true, fechaVinculacion: null }

  it('muestra solo los últimos 4 dígitos, nunca el PIN, y pide el PIN como contraseña numérica', () => {
    const html = pantalla(createElement(EquipoPinTab), [
      [['vinculacion'], v],
      [['equipo'], [{ usuarioId: 9, telefonoTerminaEn: '5678', fechaVinculacion: null }]],
    ])
    expect(html).toContain('terminado en 1234')
    expect(html).toContain('terminado en 5678')
    expect(html).toContain('type="password"')
    expect(html).toContain('inputMode="numeric"')
    expect(html).toContain('Cambiar PIN')
    expect(html).toContain('aria-label="Desvincular al usuario 9"')
  })
})

describe('panel del bot: simulador', () => {
  it('avisa que es una prueba sin efectos y tiene la conversación como log accesible', () => {
    const html = pantalla(createElement(SimuladorTab))
    expect(html).toContain('no envía nada por WhatsApp')
    expect(html).toContain('role="log"')
    expect(html).toContain('aria-live="polite"')
  })
})

describe('panel del bot: leads', () => {
  const l: Lead = {
    id: 1, tipo: 'COMPRADOR', canal: 'WHATSAPP', contactoEnmascarado: '****4455', nombre: 'Ana', tipoNegocio: null,
    interes: 'Bolso rojo', estado: 'NUEVO', creadoEn: '2026-11-24T20:05:00Z',
  }

  it('lista con el contacto enmascarado y sin revelar el completo hasta abrir el detalle', () => {
    const html = pantalla(createElement(LeadsTab), [[['leads', '', '', 0], [l]]])
    expect(html).toContain('****4455')
    expect(html).toContain('Bolso rojo')
    expect(html).toContain('Ver contacto')
    expect(html).toContain('Nuevo')
  })

  it('sin leads muestra el estado vacío', () => {
    expect(pantalla(createElement(LeadsTab), [[['leads', '', '', 0], []]])).toContain('Todavía no hay leads')
  })
})

describe('panel del bot: uso del mes', () => {
  const uso: UsoBot = { mes: '2026-11', conversaciones: 100, cupo: 100, costoUsd: 1.5, topeUsd: 10, agenteIncluido: true }

  it('muestra conversaciones, barra de cupo, costo y tope, y avisa cuando el cupo se agotó', () => {
    const html = pantalla(createElement(UsoMes), [[['uso'], uso]])
    expect(html).toContain('100 de 100 conversaciones')
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuenow="100"')
    expect(html).toContain('Llegaste al cupo')
    expect(html).toContain('tope')
  })

  it('con cupo ilimitado no muestra barra ni aviso de cupo agotado', () => {
    const html = pantalla(createElement(UsoMes), [[['uso'], { ...uso, cupo: -1, topeUsd: null }]])
    expect(html).not.toContain('role="progressbar"')
    expect(html).not.toContain('Llegaste al cupo')
    expect(html).toContain('sin límite de cupo')
  })

  it('la pestaña Canales monta el conector de cuentas de Meta', () => {
    const html = pantalla(createElement(CanalesTab), [[['canales'], []]])
    expect(html).toContain('No hay canales conectados')
  })
})
