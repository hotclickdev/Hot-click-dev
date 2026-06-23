import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { cotizacionService, formatMonto } from '@/services/cotizacionService'

export default function CotizacionPublicaPage() {
  const { token } = useParams()
  const [cot,     setCot]     = useState(null)
  const [error,   setError]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cotizacionService.publica(token)
      .then(c => { setCot(c); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [token])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f9fb' }}>
      <p className="text-sm text-gray-400">Cargando cotización...</p>
    </div>
  )

  if (error || !cot) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f9fb' }}>
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-gray-700">Cotización no encontrada</p>
        <p className="text-sm text-gray-400">El enlace puede haber expirado o ser inválido.</p>
      </div>
    </div>
  )

  const empresa  = cot.empresa ?? {}
  const cliente  = cot.cliente ?? {}
  const items    = cot.items   ?? []

  const ESTADO_COLOR = { BORRADOR: '#6b7280', ENVIADA: '#3b82f6', APROBADA: '#22c55e', RECHAZADA: '#ef4444' }
  const estadoColor  = ESTADO_COLOR[cot.estadoCotizacion] ?? '#6b7280'

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">

        {/* Encabezado */}
        <div className="px-10 py-8 flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Cotización</p>
            <p className="text-3xl font-bold text-white">{cot.numeroCotizacion}</p>
            <p className="text-slate-400 text-sm">Emitida el {cot.fechaEmision ?? '—'}</p>
            {cot.fechaVencimiento && (
              <p className="text-slate-400 text-sm">Válida hasta {cot.fechaVencimiento}</p>
            )}
          </div>
          <div className="text-right space-y-1">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: `${estadoColor}22`, color: estadoColor, border: `1px solid ${estadoColor}44` }}>
              {cot.estadoCotizacion}
            </span>
            {empresa.nombreEmpresa && (
              <p className="text-white font-bold text-lg mt-2">{empresa.nombreEmpresa}</p>
            )}
          </div>
        </div>

        <div className="px-10 py-8 space-y-8">

          {/* Datos del cliente */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Para</p>
              <p className="font-bold text-gray-900">{cliente.razonSocial ?? cliente.nombreComercial ?? cot.nombreCliente ?? '—'}</p>
              {cliente.cedulaJuridica  && <p className="text-sm text-gray-500">Cédula: {cliente.cedulaJuridica}</p>}
              {cliente.correo          && <p className="text-sm text-gray-500">{cliente.correo}</p>}
              {cliente.telefono        && <p className="text-sm text-gray-500">{cliente.telefono}</p>}
              {cliente.direccion       && <p className="text-sm text-gray-500">{cliente.direccion}</p>}
              {cliente.contactoPrincipal && <p className="text-sm text-gray-500">Attn: {cliente.contactoPrincipal}</p>}
            </div>
          </div>

          {/* Tabla de productos */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['#', 'Producto', 'Cant.', 'Unidad', 'Precio unit.', 'Desc.', 'Total'].map(h => (
                    <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const base     = (item.precioUnitario ?? 0) * (item.cantidad ?? 1)
                  const subtotal = Math.round(base * (1 - (item.descuentoPorcentaje ?? 0) / 100))
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td className="py-3 pr-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {item.imagenUrl && (
                            <img src={item.imagenUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{item.nombre}</p>
                            {item.codigo && <p className="text-xs text-gray-400">{item.codigo}</p>}
                            {item.descripcion && <p className="text-xs text-gray-400 mt-0.5">{item.descripcion}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-gray-700">{item.cantidad}</td>
                      <td className="py-3 pr-3 text-gray-500 text-xs">{item.unidadMedida}</td>
                      <td className="py-3 pr-3 text-gray-700">{formatMonto(item.precioUnitario, cot.moneda)}</td>
                      <td className="py-3 pr-3 text-gray-500">
                        {item.descuentoPorcentaje > 0 ? `${item.descuentoPorcentaje}%` : '—'}
                      </td>
                      <td className="py-3 font-semibold text-gray-900">{formatMonto(subtotal, cot.moneda)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatMonto(cot.subtotal, cot.moneda)}</span>
              </div>
              {cot.aplicaIva && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>IVA ({cot.porcentajeIva}%)</span>
                  <span>{formatMonto(cot.montoIva, cot.moneda)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2 border-gray-200" style={{ color: '#0f172a' }}>
                <span>Total</span>
                <span>{formatMonto(cot.total, cot.moneda)}</span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {cot.observaciones && (
            <div className="rounded-2xl p-4 bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Observaciones</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{cot.observaciones}</p>
            </div>
          )}

          {/* Términos */}
          {cot.terminos && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Términos y condiciones</p>
              <p className="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{cot.terminos}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">Cotización generada por HotClick</p>
          <p className="text-xs text-gray-400">{cot.numeroCotizacion}</p>
        </div>
      </div>
    </div>
  )
}
