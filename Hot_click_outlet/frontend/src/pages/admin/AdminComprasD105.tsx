import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import d105Service, { type CompraD105 } from '@/services/d105Service'

const TIPO: Record<string, string> = { '01': 'Factura', '03': 'Nota de crédito' }

const colones = (n: number) =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 0 }).format(n)

function mensajeDe(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string } } }).response?.data
    if (data?.message) return data.message
  }
  return 'No se pudo completar la acción'
}

export default function AdminComprasD105() {
  const { showToast } = useToast()
  const [compras, setCompras] = useState<CompraD105[]>([])
  const [loading, setLoading] = useState(true)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const fotoUrlRef = useRef<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await d105Service.listar()
      setCompras(data.content ?? [])
    } catch (error) {
      showToast(mensajeDe(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps -- carga al montar
  useEffect(() => () => {
    if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current)
  }, [])

  const enviar = async () => {
    if (!archivo) {
      showToast('Elegí el XML de la factura', 'error')
      return
    }
    setEnviando(true)
    try {
      await d105Service.cargar(archivo, foto)
      setArchivo(null)
      setFoto(null)
      setFormKey((n) => n + 1)
      showToast('Compra registrada', 'success')
      await cargar()
    } catch (error) {
      showToast(mensajeDe(error), 'error')
    } finally {
      setEnviando(false)
    }
  }

  const verFoto = async (id: number) => {
    try {
      const { data } = await d105Service.foto(id)
      if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current)
      const url = URL.createObjectURL(data)
      fotoUrlRef.current = url
      setFotoUrl(url)
    } catch (error) {
      showToast(mensajeDe(error), 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compras a proveedores</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            XML de factura o nota de crédito, con la foto del comprobante si la tenés.
          </p>
        </div>
        <Link to="/admin/facturas" className="text-sm font-semibold underline" style={{ color: 'var(--hc-primary)' }}>
          Ver tiquetes emitidos
        </Link>
      </div>

      <form key={formKey} className="flex flex-wrap items-end gap-3 rounded-2xl p-4"
        style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}
        onSubmit={(e) => { e.preventDefault(); void enviar() }}>
        <label className="text-sm" style={{ color: 'var(--hc-text)' }}>
          XML
          <input type="file" accept=".xml,text/xml" className="mt-1 block text-sm"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </label>
        <label className="text-sm" style={{ color: 'var(--hc-text)' }}>
          Foto
          <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
        <button type="submit" disabled={enviando}
          className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--hc-primary)' }}>
          {enviando ? 'Cargando…' : 'Registrar compra'}
        </button>
      </form>

      <Tabla compras={compras} loading={loading} onFoto={(id) => { void verFoto(id) }} />

      {fotoUrl && (
        <button type="button" className="block" onClick={() => {
          if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current)
          fotoUrlRef.current = null
          setFotoUrl(null)
        }}>
          <img src={fotoUrl} alt="Foto del comprobante de compra" className="max-h-96 rounded-xl border" />
        </button>
      )}
    </div>
  )
}

function Tabla({ compras, loading, onFoto }: {
  compras: CompraD105[]
  loading: boolean
  onFoto: (id: number) => void
}) {
  if (loading) {
    return <p className="py-10 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</p>
  }
  if (compras.length === 0) {
    return <p className="py-10 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Todavía no hay compras cargadas</p>
  }
  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--hc-border)' }}>
      <table className="w-full min-w-[720px] text-sm">
        <thead style={{ background: 'var(--hc-surface-2)' }}>
          <tr>
            {['Fecha', 'Tipo', 'Emisor', 'Neto', 'Total', 'Foto'].map((titulo) => (
              <th key={titulo} className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--hc-muted)' }}>{titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compras.map((compra) => (
            <tr key={compra.id} style={{ borderTop: '1px solid var(--hc-border)' }}>
              <td className="px-4 py-3">{compra.fechaEmision}</td>
              <td className="px-4 py-3">{TIPO[compra.tipoDocumento] ?? compra.tipoDocumento}</td>
              <td className="px-4 py-3">{compra.emisorNombre}</td>
              <td className="px-4 py-3 text-right">{colones(compra.subtotalNeto)}</td>
              <td className="px-4 py-3 text-right">{colones(compra.totalComprobante)}</td>
              <td className="px-4 py-3">
                {compra.tieneFoto
                  ? <button type="button" className="underline" onClick={() => onFoto(compra.id)}>Ver</button>
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
