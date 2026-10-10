import { useState } from 'react'
import { useList } from '@refinedev/core'
import type { Compra } from './crmDatos'
import ComprasLista from './ComprasLista'
import { AvisoCrm, CargaCrm } from './Estados'
import { Button } from './ui/Button'

const TAMANO = 20

/** Fase 1: compras de toda la plataforma con imagen y texto del producto. */
export default function CrmCompras() {
  const [pagina, setPagina] = useState(1)
  const { result, query } = useList<Compra>({
    resource: 'compras',
    pagination: { currentPage: pagina, pageSize: TAMANO, mode: 'server' },
  })
  const total = result.total ?? 0
  const paginas = Math.max(1, Math.ceil(total / TAMANO))

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-[28px] font-extrabold leading-8 text-hc-n-900">Compras</h1>
        <p className="mt-1 max-w-2xl text-sm text-hc-n-600">
          Qué compró cada persona y en qué negocio, con la foto y el texto del producto. Los montos son los guardados en cada pedido.
        </p>
      </div>
      {query.isLoading && <CargaCrm />}
      {query.isError && <AvisoCrm>No se pudieron cargar las compras.</AvisoCrm>}
      {query.isSuccess && result.data.length === 0 && <AvisoCrm>Todavía no hay compras.</AvisoCrm>}
      {result.data.length > 0 && <ComprasLista compras={result.data} />}
      {total > TAMANO && (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm text-hc-n-600">
          <Button size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
          <span>Página {pagina} de {paginas}</span>
          <Button size="sm" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</Button>
        </nav>
      )}
    </section>
  )
}
