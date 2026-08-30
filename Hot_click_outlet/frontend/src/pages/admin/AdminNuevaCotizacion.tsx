import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cotizacionService, cotizacionClienteService } from '@/services/cotizacionService'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import CotizacionForm, {
  mensajeErrorCotizacion,
  type ClienteB2B,
  type FormCotizacion,
  type ItemCotizacionForm,
} from './nueva-cotizacion/CotizacionForm'
import ModalCliente from './nueva-cotizacion/ModalCliente'
import { ITEM_VACIO } from './nueva-cotizacion/nuevaCotizacionUi'
import type { Id, JsonBody } from '@/types/api'
import type { Producto } from '@/types/producto'

type CotizacionDetalleItem = {
  tipo?: string
  producto?: { id?: Id }
  codigo?: string
  nombre?: string
  descripcion?: string
  imagenUrl?: string
  cantidad?: number
  unidadMedida?: string
  precioUnitario?: number
  descuentoPorcentaje?: number
}

type CotizacionDetalle = {
  cliente?: { id?: Id }
  fechaEmision?: string
  fechaVencimiento?: string
  estadoCotizacion?: string
  aplicaIva?: boolean
  porcentajeIva?: number
  observaciones?: string
  terminos?: string
  moneda?: string
  items?: CotizacionDetalleItem[]
}

export default function AdminNuevaCotizacion() {
  const navigate   = useNavigate()
  const { id }     = useParams()
  const { showToast: toast }  = useToast()
  const esEdicion  = !!id

  const [clientes,  setClientes]  = useState<ClienteB2B[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [items,     setItems]     = useState<ItemCotizacionForm[]>([{ ...ITEM_VACIO }])
  const [modalCliente, setModalCliente] = useState(false)
  const [loading,   setLoading]   = useState(false)

  const [form, setForm] = useState<FormCotizacion>({
    clienteId:        '',
    fechaEmision:     new Date().toISOString().slice(0, 10),
    fechaVencimiento: '',
    estadoCotizacion: 'BORRADOR',
    aplicaIva:        false,
    porcentajeIva:    13,
    observaciones:    '',
    terminos:         'Validez de esta cotización: 30 días calendario.\nPrecios en colones costarricenses.\nForma de pago: 50% anticipo, 50% contra entrega.',
    moneda:           'CRC',
  })

  const cargarDatos = useCallback(async () => {
    try {
      const [listaClientes, listaProd] = await Promise.all([
        cotizacionClienteService.listar(),
        productService.getAll(0, 200).then(r => {
          const data = r.data as { content?: Producto[] } | Producto[] | undefined
          return (data as { content?: Producto[] })?.content ?? (data as Producto[]) ?? []
        }),
      ])
      setClientes(listaClientes as ClienteB2B[])
      setProductos(listaProd)
    } catch { toast('Error al cargar datos', 'error') }
  }, [toast])

  useEffect(() => { cargarDatos() }, [cargarDatos]) // eslint-disable-line react-hooks/set-state-in-effect -- carga de clientes y productos al montar

  useEffect(() => {
    if (!esEdicion) return
    cotizacionService.detalle(id as string).then((raw: unknown) => {
      const c = raw as CotizacionDetalle
      setForm({
        clienteId:        c.cliente?.id ?? '',
        fechaEmision:     c.fechaEmision ?? '',
        fechaVencimiento: c.fechaVencimiento ?? '',
        estadoCotizacion: c.estadoCotizacion ?? 'BORRADOR',
        aplicaIva:        c.aplicaIva ?? false,
        porcentajeIva:    c.porcentajeIva ?? 13,
        observaciones:    c.observaciones ?? '',
        terminos:         c.terminos ?? '',
        moneda:           c.moneda ?? 'CRC',
      })
      setItems(c.items?.map(i => ({
        tipo:               i.tipo,
        productoId:         i.producto?.id ?? null,
        codigo:             i.codigo ?? '',
        nombre:             i.nombre ?? '',
        descripcion:        i.descripcion ?? '',
        imagenUrl:          i.imagenUrl ?? '',
        cantidad:           i.cantidad,
        unidadMedida:       i.unidadMedida,
        precioUnitario:     i.precioUnitario,
        descuentoPorcentaje: i.descuentoPorcentaje,
      })) ?? [{ ...ITEM_VACIO }])
    }).catch(() => toast('Error al cargar cotización', 'error'))
  }, [id, esEdicion, toast])

  const subtotal = items.reduce((acc, i) => {
    const base = (i.precioUnitario || 0) * (i.cantidad || 1)
    return acc + Math.round(base * (1 - (i.descuentoPorcentaje || 0) / 100))
  }, 0)

  const montoIva = form.aplicaIva ? Math.round(subtotal * (form.porcentajeIva || 13) / 100) : 0
  const total    = subtotal + montoIva

  const setF = <K extends keyof FormCotizacion>(k: K, v: FormCotizacion[K]) => setForm(f => ({ ...f, [k]: v }))

  const actualizarItem = (index: number, patch: Partial<ItemCotizacionForm>) =>
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))

  const agregarItem = () => setItems(prev => [...prev, { ...ITEM_VACIO }])

  const eliminarItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index))

  async function guardar() {
    if (!form.clienteId) { toast('Seleccioná un cliente', 'error'); return }
    if (items.length === 0) { toast('Agregá al menos un producto', 'error'); return }

    setLoading(true)
    try {
      const dto = {
        ...form,
        clienteId: Number(form.clienteId),
        items: items.map((it, orden) => ({ ...it, orden })),
      }
      if (esEdicion) {
        await cotizacionService.actualizar(id as string, dto as JsonBody)
        toast('Cotización actualizada', 'success')
      } else {
        await cotizacionService.crear(dto as JsonBody)
        toast('Cotización creada', 'success')
      }
      navigate('/admin/cotizaciones')
    } catch (e: unknown) {
      toast(mensajeErrorCotizacion(e, 'Error al guardar'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <CotizacionForm
        esEdicion={esEdicion}
        form={form}
        setF={setF}
        clientes={clientes}
        productos={productos}
        items={items}
        actualizarItem={actualizarItem}
        agregarItem={agregarItem}
        eliminarItem={eliminarItem}
        onNuevoCliente={() => setModalCliente(true)}
        subtotal={subtotal}
        montoIva={montoIva}
        total={total}
        loading={loading}
        onGuardar={guardar}
        onCancelar={() => navigate('/admin/cotizaciones')}
      />
      {modalCliente && (
        <ModalCliente
          onClose={() => setModalCliente(false)}
          onCreado={c => {
            setClientes(prev => [...prev, c])
            setF('clienteId', c.id as FormCotizacion['clienteId'])
            setModalCliente(false)
          }}
        />
      )}
    </>
  )
}
