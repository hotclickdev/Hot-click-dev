/** Tipos de falla reportables desde POS cajero o pago cliente (multi-selección). */
export const POS_REPORTE_TIPOS = [
  'qr_no_genera',
  'cliente_no_paga',
  'pago_tarjeta',
  'sinpe',
  'total_incorrecto',
  'pantalla_incorrecta',
  'turno_caja',
  'otro',
] as const

export type PosReporteTipoId = (typeof POS_REPORTE_TIPOS)[number]

export function etiquetaTipoReporte(
  id: PosReporteTipoId,
  t: (key: string) => string,
): string {
  return t(`pos.reporte.tipos.${id}`)
}
