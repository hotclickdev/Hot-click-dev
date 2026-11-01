/** M4: regímenes de IVA que acepta el backend (PUT /empresa/perfil/fiscal). */
export type RegimenIva = 'SIMPLIFICADO' | 'TRADICIONAL'

export const REGIMENES_IVA: ReadonlyArray<{ valor: RegimenIva; titulo: string; detalle: string }> = [
  {
    valor: 'SIMPLIFICADO',
    titulo: 'Régimen simplificado',
    detalle: 'Tus precios no traen IVA. Si el cliente pide factura electrónica, al total se le suma el IVA (13 %).',
  },
  {
    valor: 'TRADICIONAL',
    titulo: 'Régimen tradicional',
    detalle: 'Tus precios ya traen el IVA incluido. El cliente paga lo mismo con factura o con tiquete.',
  },
]

export function normalizarRegimenIva(v?: string | null): RegimenIva {
  return v === 'TRADICIONAL' ? 'TRADICIONAL' : 'SIMPLIFICADO'
}
