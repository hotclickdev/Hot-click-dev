export type PasoTourId = 'bodega' | 'producto' | 'cobro' | 'negocio' | 'tienda'

export type HechosTour = {
  bodegas: number
  productos: number
  metodosCobro: number
  tieneUbicacion: boolean
  vioTienda: boolean
}

export type PasoTour = {
  id: PasoTourId
  titulo: string
  detalle: string
  completo: boolean
  bloqueado: boolean
  opcional: boolean
}

const ORDEN: readonly PasoTourId[] = ['bodega', 'producto', 'cobro', 'negocio', 'tienda']

export function evaluarPasos(hechos: HechosTour): PasoTour[] {
  const bodegaLista = hechos.bodegas > 0
  const productoListo = hechos.productos > 0
  const cobroListo = hechos.metodosCobro > 0
  const negocioListo = hechos.tieneUbicacion
  const tiendaLista = hechos.vioTienda

  const completo: Record<PasoTourId, boolean> = {
    bodega: bodegaLista,
    producto: productoListo,
    cobro: cobroListo,
    negocio: negocioListo,
    tienda: tiendaLista,
  }
  const texto: Record<PasoTourId, { titulo: string; detalle: string; opcional: boolean }> = {
    bodega: {
      titulo: 'Creá una bodega',
      detalle: 'Ahí guardás el inventario y definís quién está a cargo.',
      opcional: false,
    },
    producto: {
      titulo: 'Creá un producto',
      detalle: 'Sin bodega no hay dónde guardarlo, por eso este paso espera.',
      opcional: false,
    },
    cobro: {
      titulo: 'Configurá el cobro',
      detalle: 'Decí a qué cuenta llega el dinero de tus ventas.',
      opcional: false,
    },
    negocio: {
      titulo: 'Completá los datos del negocio',
      detalle: 'Nombre, contacto y la ubicación desde donde despachás.',
      opcional: false,
    },
    tienda: {
      titulo: 'Mirá tu tienda',
      detalle: 'Opcional: revisá cómo la ve quien compra.',
      opcional: true,
    },
  }

  return ORDEN.map((id, indice) => {
    const anteriorListo = ORDEN.slice(0, indice)
      .filter((previo) => !texto[previo].opcional)
      .every((previo) => completo[previo])
    return {
      id,
      titulo: texto[id].titulo,
      detalle: texto[id].detalle,
      completo: completo[id],
      bloqueado: !anteriorListo,
      opcional: texto[id].opcional,
    }
  })
}

export function guiaObligatoriaLista(pasos: readonly PasoTour[]): boolean {
  return pasos.filter((paso) => !paso.opcional).every((paso) => paso.completo)
}

export function indicePasoActivo(pasos: readonly PasoTour[]): number {
  const pendiente = pasos.findIndex((paso) => !paso.opcional && !paso.completo)
  return pendiente === -1 ? Math.max(pasos.length - 1, 0) : pendiente
}

export function pasoSiguiente(pasos: readonly PasoTour[]): PasoTour | null {
  return pasos.find((paso) => !paso.completo && !paso.bloqueado) ?? null
}
