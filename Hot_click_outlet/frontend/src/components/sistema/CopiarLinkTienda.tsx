import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { urlAbsolutaDesdeRuta } from '@/utils/rutaTienda'
import { copiarAlPortapapeles } from '@/utils/portapapeles'

const ESTILO_CHIP = {
  backgroundColor: 'var(--hc-surface)',
  color: 'var(--hc-text)',
  border: '1px solid var(--hc-border)',
}

/**
 * Copia la URL pública de la tienda. Solo renderizar si la tienda ya responde.
 */
export default function CopiarLinkTienda({ ruta, mostrarUrl = false }: { ruta: string; mostrarUrl?: boolean }) {
  const toast = useToast()
  const [copiado, setCopiado] = useState(false)
  const url = urlAbsolutaDesdeRuta(ruta)
  if (!url) return null
  const urlAbsoluta = url

  async function copiar() {
    try {
      await copiarAlPortapapeles(urlAbsoluta)
      setCopiado(true)
      toast({ message: 'Link de tu tienda copiado', type: 'success' })
    } catch (err) {
      console.error('[CopiarLinkTienda]', err)
      toast({ message: 'No se pudo copiar el link.', type: 'error' })
    }
  }

  return (
    <div className={mostrarUrl ? 'flex flex-col gap-2 items-stretch' : 'inline-flex'}>
      {mostrarUrl && (
        <p className="text-sm font-mono break-all m-0" style={{ color: '#6b6459' }}>{ruta}</p>
      )}
      <button
        type="button"
        onClick={copiar}
        className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-3.5 rounded-xl text-sm font-semibold"
        style={ESTILO_CHIP}
      >
        <IconoCopiar />
        {copiado ? 'Link copiado' : 'Copiar link de tu tienda'}
      </button>
    </div>
  )
}

function IconoCopiar() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}
