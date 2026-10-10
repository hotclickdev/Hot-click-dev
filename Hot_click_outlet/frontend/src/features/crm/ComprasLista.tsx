import { Link } from 'react-router-dom'
import type { Compra } from './crmDatos'
import { etiquetaEstado, fechaOGuion, montoOGuion, numeroOGuion, textoOGuion, tonoEstado } from './crmDatos'
import { Badge } from './ui/Badge'
import { Card } from './ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from './ui/Table'

function Miniatura({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-hc-n-100 text-xs text-hc-n-600">—</span>
  }
  return <img src={url} alt={alt} loading="lazy" decoding="async" className="size-12 shrink-0 rounded-xl border border-hc-n-200 object-cover" />
}

function Productos({ compra }: { compra: Compra }) {
  if (compra.lineas.length === 0) return <span className="text-hc-n-600">—</span>
  return (
    <ul className="flex flex-col gap-2">
      {compra.lineas.map((l, i) => (
        <li key={`${compra.id}-${l.productoId ?? i}`} className="flex min-w-0 items-center gap-3">
          <Miniatura url={l.imagenUrl} alt={textoOGuion(l.nombre)} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-hc-n-900">{textoOGuion(l.nombre)}</span>
            {l.descripcion && <span className="block max-w-[38ch] truncate text-xs text-hc-n-600">{l.descripcion}</span>}
            <span className="block text-xs text-hc-n-600">
              {numeroOGuion(l.cantidad)} × {montoOGuion(l.precioUnitario)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function Negocio({ compra }: { compra: Compra }) {
  if (!compra.negocio) return <>—</>
  return <Link className="font-semibold text-hc-blue-600" to={`/plataforma/crm/negocios/${compra.negocio.id}`}>{textoOGuion(compra.negocio.nombre)}</Link>
}

function Comprador({ compra }: { compra: Compra }) {
  if (!compra.comprador) return <>—</>
  return <Link className="font-semibold text-hc-blue-600" to={`/plataforma/crm/compradores/${compra.comprador.id}`}>{textoOGuion(compra.comprador.nombre)}</Link>
}

/** Compras con imagen y texto del producto: tabla en escritorio, tarjetas en móvil. */
export default function ComprasLista({ compras, ocultar = [] }: { compras: Compra[]; ocultar?: Array<'negocio' | 'comprador'> }) {
  const verNegocio = !ocultar.includes('negocio')
  const verComprador = !ocultar.includes('comprador')
  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden" aria-label="Compras">
        {compras.map((c) => (
          <li key={c.id}>
            <Card className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span>
                  <span className="block font-display text-[15px] font-bold text-hc-n-900">{textoOGuion(c.numeroPedido)}</span>
                  <span className="block text-xs text-hc-n-600">{fechaOGuion(c.fecha)}</span>
                </span>
                <Badge tono={tonoEstado(c.estado)}>{etiquetaEstado(c.estado)}</Badge>
              </div>
              <Productos compra={c} />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex flex-col gap-0.5">
                  {verNegocio && <Negocio compra={c} />}
                  {verComprador && <Comprador compra={c} />}
                </span>
                <span className="font-display text-[17px] font-extrabold text-hc-n-900">{montoOGuion(c.total)}</span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="hidden p-0 md:block">
        <TableRoot>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Pedido</TableHeaderCell>
                <TableHeaderCell>Productos</TableHeaderCell>
                {verNegocio && <TableHeaderCell>Negocio</TableHeaderCell>}
                {verComprador && <TableHeaderCell>Comprador</TableHeaderCell>}
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell className="text-right">Total</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {compras.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="block font-semibold text-hc-n-900">{textoOGuion(c.numeroPedido)}</span>
                    <span className="block text-xs text-hc-n-600">{fechaOGuion(c.fecha)}</span>
                  </TableCell>
                  <TableCell className="whitespace-normal"><Productos compra={c} /></TableCell>
                  {verNegocio && <TableCell><Negocio compra={c} /></TableCell>}
                  {verComprador && <TableCell><Comprador compra={c} /></TableCell>}
                  <TableCell><Badge tono={tonoEstado(c.estado)}>{etiquetaEstado(c.estado)}</Badge></TableCell>
                  <TableCell className="text-right font-display font-bold text-hc-n-900">{montoOGuion(c.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRoot>
      </Card>
    </>
  )
}
