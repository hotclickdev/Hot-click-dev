import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { importService } from '@/services/importService'
import { productService } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { adminService, warehouseService } from '@/services/orderService'
import { detectarColor } from '@/utils/colorDetector'
import { fmtColones, innerData, mensajeErrorImportar } from '../importar/importarHelpers'
import type {
  BodegaImportar,
  CategoriaImportar,
  EmpresaImportar,
  ImportarTabId,
  MarcaImportar,
  ProductoImportado,
  ToastImportar,
} from '../importar/importarHelpers'
import type { JsonBody } from '@/types/api'

/**
 * Handlers importación catálogo — bit-idéntico al original.
 */
export function useAdminImportarActions(deps: {
  esAdminIT: boolean
  tab: ImportarTabId
  url: string
  archivo: File | null
  empresaSeleccionada: string
  bodegaGlobal: string
  seleccionados: ProductoImportado[]
  algunoInvalido: boolean
  addToast: ToastImportar
  setCargando: Dispatch<SetStateAction<boolean>>
  setGuardando: Dispatch<SetStateAction<boolean>>
  setProductos: Dispatch<SetStateAction<ProductoImportado[]>>
  setCategorias: Dispatch<SetStateAction<CategoriaImportar[]>>
  setMarcas: Dispatch<SetStateAction<MarcaImportar[]>>
  setBodegas: Dispatch<SetStateAction<BodegaImportar[]>>
  setEmpresas: Dispatch<SetStateAction<EmpresaImportar[]>>
  setEmpresaSeleccionada: Dispatch<SetStateAction<string>>
  setBodegaGlobal: Dispatch<SetStateAction<string>>
  setPaso: Dispatch<SetStateAction<number>>
  setCatGlobal?: Dispatch<SetStateAction<string>>
  setMarcaGlobal?: Dispatch<SetStateAction<string>>
  setCondicionGlobal?: Dispatch<SetStateAction<string>>
  setStockGlobal?: Dispatch<SetStateAction<string>>
  setMargenGlobal?: Dispatch<SetStateAction<string>>
  margenGlobal: string
  catGlobal: string
  marcaGlobal: string
  condicionGlobal: string
  stockGlobal: string
}) {
  const {
    esAdminIT,
    tab,
    url,
    archivo,
    empresaSeleccionada,
    bodegaGlobal,
    seleccionados,
    algunoInvalido,
    addToast,
    setCargando,
    setGuardando,
    setProductos,
    setCategorias,
    setMarcas,
    setBodegas,
    setEmpresas,
    setEmpresaSeleccionada,
    setBodegaGlobal,
    setPaso,
    margenGlobal,
    catGlobal,
    marcaGlobal,
    condicionGlobal,
    stockGlobal,
  } = deps

  const navigate = useNavigate()

  const cargarDatosFormulario = useCallback(async () => {
    try {
      const llamadas = [productService.getCategories(), marcaService.getAll()]
      if (!esAdminIT) llamadas.push(warehouseService.getAll())
      else llamadas.push(adminService.getEmpresas())

      const [catRes, marcRes, terceraRes] = await Promise.all(llamadas)
      const cats = innerData(catRes.data) ?? catRes.data ?? []
      const mars = innerData(marcRes.data) ?? marcRes.data ?? []
      setCategorias(cats as CategoriaImportar[])
      setMarcas(mars as MarcaImportar[])

      if (esAdminIT) {
        setEmpresas((innerData(terceraRes.data) ?? []) as EmpresaImportar[])
      } else {
        const bods = (innerData(terceraRes.data) ?? terceraRes.data ?? []) as BodegaImportar[]
        setBodegas(bods)
        if (bods.length > 0) setBodegaGlobal(String(bods[0].id))
      }
    } catch (err: unknown) { void err /* silencioso */ }
  }, [esAdminIT, setBodegaGlobal, setBodegas, setCategorias, setEmpresas, setMarcas])

  const onCambiarEmpresa = useCallback(async (id: string) => {
    setEmpresaSeleccionada(id)
    setBodegaGlobal('')
    if (!id) { setBodegas([]); return }
    try {
      const bodRes = await warehouseService.getAll({ empresaId: id })
      const bods = (innerData(bodRes.data) ?? bodRes.data ?? []) as BodegaImportar[]
      setBodegas(bods)
      if (bods.length > 0) setBodegaGlobal(String(bods[0].id))
    } catch (err: unknown) {
      void err
      addToast('No se pudieron cargar las bodegas de esa empresa', 'error')
    }
  }, [addToast, setBodegaGlobal, setBodegas, setEmpresaSeleccionada])

  const extraer = useCallback(async () => {
    setCargando(true)
    try {
      let res
      if (tab === 'url') {
        if (!url.trim()) { addToast('Ingresá una URL', 'error'); return }
        res = await importService.extraerDeUrl(url.trim())
      } else if (tab === 'pdf') {
        if (!archivo) { addToast('Seleccioná un PDF', 'error'); return }
        res = await importService.extraerDePdf(archivo)
      } else {
        if (!archivo) { addToast('Seleccioná un CSV', 'error'); return }
        res = await importService.extraerDeCsv(archivo)
      }

      const data = (innerData(res.data) ?? res.data ?? []) as ProductoImportado[]
      if (data.length === 0) {
        addToast('No se encontraron productos en la fuente indicada', 'warning')
        return
      }

      const detectados = data.map((p) => detectarColor(p.nombreProducto || ''))
      const conteoPorClave = new Map<string, number>()
      detectados.forEach(({ label, nombreSinColor }) => {
        if (!label) return
        const clave = nombreSinColor.toLowerCase()
        conteoPorClave.set(clave, (conteoPorClave.get(clave) ?? 0) + 1)
      })
      const idPorClave = new Map<string, string>()

      setProductos(data.map((p, i) => {
        const { label, nombreSinColor } = detectados[i]
        const clave = nombreSinColor.toLowerCase()
        let grupoVarianteId: string | null = null
        if (label && (conteoPorClave.get(clave) ?? 0) >= 2) {
          if (!idPorClave.has(clave)) idPorClave.set(clave, crypto.randomUUID())
          grupoVarianteId = idPorClave.get(clave) ?? null
        }
        return {
          ...p,
          _id:          i,
          _sel:         true,
          _ventaFmt:    fmtColones(p.precioVenta  ?? 0),
          _costoFmt:    fmtColones(p.precioCompra ?? 0),
          precioVenta:  p.precioVenta  ?? 0,
          precioCompra: p.precioCompra ?? 0,
          stockActual:  0,
          condicion:    'NUEVO',
          colorVariante: label,
          grupoVarianteId,
        }
      }))

      await cargarDatosFormulario()
      setPaso(2)
    } catch (err: unknown) {
      addToast(mensajeErrorImportar(err, 'Error al extraer productos'), 'error')
    } finally {
      setCargando(false)
    }
  }, [addToast, archivo, cargarDatosFormulario, setCargando, setPaso, setProductos, tab, url])

  const aplicarCategoriaATodos = useCallback(() => {
    if (!catGlobal) return
    setProductos(prev => prev.map(p => p._sel ? { ...p, categoriaId: Number(catGlobal) } : p))
    addToast('Categoría aplicada a todos los seleccionados', 'success')
  }, [addToast, catGlobal, setProductos])

  const aplicarMarcaATodos = useCallback(() => {
    if (!marcaGlobal) return
    setProductos(prev => prev.map(p => p._sel ? { ...p, marcaId: Number(marcaGlobal) } : p))
    addToast('Marca aplicada a todos los seleccionados', 'success')
  }, [addToast, marcaGlobal, setProductos])

  const aplicarCondicionATodos = useCallback(() => {
    setProductos(prev => prev.map(p => p._sel ? { ...p, condicion: condicionGlobal } : p))
    addToast('Condición aplicada a todos los seleccionados', 'success')
  }, [addToast, condicionGlobal, setProductos])

  const aplicarStockATodos = useCallback(() => {
    const valor = Math.max(0, Number.parseInt(stockGlobal, 10) || 0)
    setProductos(prev => prev.map(p => p._sel ? { ...p, stockActual: valor } : p))
    addToast('Stock aplicado a todos los seleccionados', 'success')
  }, [addToast, setProductos, stockGlobal])

  const aplicarMargenATodos = useCallback(() => {
    const pct = Number.parseFloat(margenGlobal)
    if (Number.isNaN(pct)) return
    setProductos(prev => prev.map(p => {
      if (!p._sel || p.precioCompra == null) return p
      const venta = Math.round(p.precioCompra * (1 + pct / 100))
      return { ...p, precioVenta: venta, _ventaFmt: fmtColones(venta) }
    }))
    addToast(`Precio de venta recalculado (costo + ${pct}%) en los seleccionados`, 'success')
  }, [addToast, margenGlobal, setProductos])

  const confirmar = useCallback(async () => {
    if (seleccionados.length === 0) { addToast('Seleccioná al menos un producto', 'error'); return }
    if (algunoInvalido)             { addToast('Completá nombre y categoría en todos los seleccionados', 'error'); return }
    if (esAdminIT && !empresaSeleccionada) {
      addToast('Elegí la empresa a la que se van a asignar los productos', 'error')
      return
    }

    setGuardando(true)
    try {
      const bodegaId = bodegaGlobal ? Number(bodegaGlobal) : null

      const payload: JsonBody[] = seleccionados.map(p => ({
        nombreProducto:     p.nombreProducto,
        precioVenta:        p.precioVenta    ?? 0,
        precioCompra:       p.precioCompra   ?? 0,
        descripcionCorta:   p.descripcionCorta ?? '',
        imagenPrincipalUrl: p.imagenPrincipalUrl ?? null,
        marcaTexto:         p.marcaTexto ?? null,
        categoriaId:        p.categoriaId,
        marcaId:            p.marcaId    ?? null,
        bodegaId:           p.bodegaId   ?? bodegaId,
        stockActual:        Number.parseInt(String(p.stockActual ?? 0), 10),
        condicion:          p.condicion  ?? 'NUEVO',
        grupoVarianteId:    p.grupoVarianteId ?? null,
        colorVariante:      p.colorVariante   ?? null,
      }))

      const res = await importService.confirmar(payload, esAdminIT ? Number(empresaSeleccionada) : null)
      const resultado = (innerData(res.data) ?? {}) as { ok?: unknown; errores?: unknown[] }
      const { ok, errores } = resultado
      addToast(`${ok} producto(s) importado(s) correctamente`, 'success')
      if (errores?.length) addToast(`${errores.length} con errores`, 'warning')
      navigate('/admin/productos')
    } catch (err: unknown) {
      addToast(mensajeErrorImportar(err, 'Error al importar'), 'error')
    } finally {
      setGuardando(false)
    }
  }, [
    addToast,
    algunoInvalido,
    bodegaGlobal,
    empresaSeleccionada,
    esAdminIT,
    navigate,
    seleccionados,
    setGuardando,
  ])

  return {
    cargarDatosFormulario,
    onCambiarEmpresa,
    extraer,
    aplicarCategoriaATodos,
    aplicarMarcaATodos,
    aplicarCondicionATodos,
    aplicarStockATodos,
    aplicarMargenATodos,
    confirmar,
  }
}
