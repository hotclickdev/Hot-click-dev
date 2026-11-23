import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { aprobacionService } from '@/services/aprobacionService'
import { altaFasesAdminService } from '@/services/altaNegocioService'
import { filasDe, idSeguro, texto, type Fila } from './normalizar'
import { Aviso, Carga, FilaDecision } from './piezas'
import { metaRevision } from './revisionHotClick'

/**
 * Negocios en «Revisión HotClick»: ya llenaron sus datos y su cuenta ONVO está activa. Se revisa el negocio y sus
 * productos y se aprueba (se publica y puede vender en línea) o se rechaza con un motivo.
 */
export default function RevisionHotClick() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [marca, setMarca] = useState(0)

  useEffect(() => {
    altaFasesAdminService.revision()
      .then((r) => { setFilas(filasDe(r.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [marca])

  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudo cargar la revisión.</Aviso>
  if (filas.length === 0) return <Aviso>Ningún negocio espera revisión. Aparecen acá cuando su cuenta de ONVO queda activa.</Aviso>
  return (
    <div className="flex flex-col gap-4">
      {filas.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        return (
          <div key={id} className="flex flex-col gap-1">
            <FilaDecision
              titulo={texto(fila.nombre, 'Negocio')}
              icono="negocios"
              meta={metaRevision(fila)}
              onAprobar={async () => { await aprobacionService.aprobarEmpresa(id); setMarca((n) => n + 1) }}
              onRechazar={async (motivo) => { await aprobacionService.rechazarEmpresa(id, motivo); setMarca((n) => n + 1) }}
            />
            <Link to={`/plataforma/negocios/${id}`} className="px-1 text-sm font-semibold text-hc-blue-600">
              Ver negocio y productos
            </Link>
          </div>
        )
      })}
    </div>
  )
}
