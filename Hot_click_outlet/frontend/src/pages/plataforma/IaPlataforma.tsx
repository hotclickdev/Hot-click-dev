import { useEffect, useState } from 'react'
import { securityService } from '@/services/securityService'
import { flagService } from '@/services/flagService'
import { campoLista, idSeguro, texto, type Fila } from './normalizar'
import { Aviso, Carga, Chip, Encabezado, TARJETA } from './piezas'

export default function IaPlataforma() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [costo, setCosto] = useState<number | null>(null)
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [marca, setMarca] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => {
    const hoy = new Date()
    securityService.getAiDashboard(hoy.getFullYear(), hoy.getMonth() + 1)
      .then((r) => {
        const data = r.data as { costoTotal?: unknown }
        setCosto(typeof data?.costoTotal === 'number' ? data.costoTotal : null)
        setFilas(campoLista(r.data, 'empresas'))
        setEstado('listo')
      })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [marca])

  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudo cargar el uso de IA.</Aviso>

  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="IA" detalle="Uso del mes y el chat público. Es una estimación, no una factura." marca={costo == null ? '—' : costo.toFixed(2)} />
      {error && <p className="text-sm text-hc-primary-text">{error}</p>}
      {filas.length === 0 && <Aviso>No hay uso registrado este mes.</Aviso>}
      <div className="grid gap-3 sm:grid-cols-2">
      {filas.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        const activo = fila.chatActivo === true
        const llamadas = numero(fila.llamadas)
        const limite = numero(fila.limite)
        const ancho = limite > 0 ? Math.min(100, Math.round((llamadas / limite) * 100)) : 0
        return (
          <article key={id} className={TARJETA}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-[17px] font-bold">{texto(fila.nombre, 'Negocio')}</p>
              <Chip tono={activo ? 'ok' : 'neutro'}>{activo ? 'Chat encendido' : 'Chat apagado'}</Chip>
            </div>
            <p className="mt-1 text-xs text-hc-n-600">
              {texto(fila.llamadas, '0')} llamadas · tope {texto(fila.limite, '—')} · {texto(fila.plan, '')}
              {texto(fila.tokensEntrada) ? ` · ${texto(fila.tokensEntrada)} tokens` : ''}
              {texto(fila.costoUsd) ? ` · USD ${texto(fila.costoUsd)}` : ''}
            </p>
            <div className="mt-3 h-2 rounded-full bg-hc-n-100">
              <div className="h-2 rounded-full bg-hc-blue-600" style={{ width: `${ancho}%` }} />
            </div>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-hc-blue-600"
              onClick={() => void alternar(id, activo, () => setMarca((n) => n + 1), setError)}
            >
              {activo ? 'Apagar chat público' : 'Encender chat público'}
            </button>
          </article>
        )
      })}
      </div>
    </div>
  )
}

function numero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}

async function alternar(id: string, activo: boolean, listo: () => void, fallar: (mensaje: string) => void) {
  if (activo && !globalThis.confirm('¿Apagar el chat público de este negocio?')) return
  try {
    await flagService.set(id, 'chat_publico', !activo)
    fallar('')
    listo()
  } catch (err) {
    console.error(err)
    fallar('No se pudo cambiar el chat público.')
  }
}
