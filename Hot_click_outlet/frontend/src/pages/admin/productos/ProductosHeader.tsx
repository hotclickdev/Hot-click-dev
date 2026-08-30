import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'
import ImportExportBar from '@/components/admin/ImportExportBar'
import EmpresaProfileCard from '@/components/admin/EmpresaProfileCard'
import {
  COLUMNAS_EXPORT,
  COLUMNAS_IMPORT,
  filasExportProductos,
  mapImportRow,
} from './productosHelpers'
import type { BodegaAdmin, FilaImportProducto, ProductoAdmin } from './productosHelpers'
import TextoMas from '@/components/ui/TextoMas'
import type { TFunction } from 'i18next'

export type ProductosHeaderProps = {
  t: TFunction
  filteredCount: number
  totalProds: number
  products: ProductoAdmin[]
  bodegas: BodegaAdmin[]
  onImport: (rows: unknown[]) => void
  onNuevo: () => void
  vistaSimple?: boolean
}

export default function ProductosHeader({ t, filteredCount, totalProds, products, bodegas, onImport, onNuevo, vistaSimple }: ProductosHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{t('admin.products.title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{t('admin.products.countOf', { filtered: filteredCount, total: totalProds })}</p>
        </div>
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{t('admin.products.account')}</span>
          <EmpresaProfileCard totalProductos={totalProds} />
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {!vistaSimple && (
          <>
            <ImportExportBar
              data={filasExportProductos(products)}
              columns={COLUMNAS_EXPORT}
              filename="productos"
              sheetName="Productos"
              importColumns={COLUMNAS_IMPORT}
              mapImportRow={(row: FilaImportProducto) => mapImportRow(row, bodegas[0]?.id)}
              onImport={onImport}
            />
            <Link
              to="/admin/productos/carga-masiva"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--hc-surface-2)]"
              style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
              </svg>
              {t('admin.products.bulkUpload')}
            </Link>
          </>
        )}
        <Button onClick={onNuevo} data-mm="nuevo-producto"><TextoMas>{t('admin.products.new')}</TextoMas></Button>
      </div>
    </div>
  )
}
