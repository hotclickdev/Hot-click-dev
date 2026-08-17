import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { importService } from '@/services/importService'
import { productService } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { adminService, warehouseService } from '@/services/orderService'
import { detectarColor } from '@/utils/colorDetector'
import { fmtColones } from '../importar/importarHelpers'

/**
 * Handlers importación catálogo — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminImportarActions(deps) {
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
    setCatGlobal,
    setMarcaGlobal,
    setCondicionGlobal,
    setStockGlobal,
    setMargenGlobal,
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
      const cats = catRes.data?.data ?? catRes.data ?? []
      const mars = marcRes.data?.data ?? marcRes.data ?? []
      setCategorias(cats)
      setMarcas(mars)

      if (esAdminIT) {
        setEmpresas(terceraRes.data?.data ?? [])
      } else {
        const bods = terceraRes.data?.data ?? terceraRes.data ?? []
        setBodegas(bods)
        if (bods.length > 0) setBodegaGlobal(String(bods[0].id))
      }
    } catch { /* silencioso */ }
  }, [esAdminIT, setBodegaGlobal, setBodegas, setCategorias, setEmpresas, setMarcas])

  const onCambiarEmpresa = useCallback(async (id) => {
    setEmpresaSeleccionada(id)
    setBodegaGlobal('')
    if (!id) { setBodegas([]); return }
    try {
      const bodRes = await warehouseService.getAll({ empresaId: id })
      const bods = bodRes.data?.data ?? bodRes.data ?? []
      setBodegas(bods)
      if (bods.length > 0) setBodegaGlobal(String(bods[0].id))
    } catch {
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

      const data = res.data?.data ?? res.data ?? []
      if (data.length === 0) {
        addToast('No se encontraron productos en la fuente indicada', 'warning')
        return
      }

      const detectados = data.map((p) => detectarColor(p.nombreProducto || ''))
      const conteoPorClave = new Map()
      detectados.forEach(({ label, nombreSinColor }) => {
        if (!label) return
        const clave = nombreSinColor.toLowerCase()
        conteoPorClave.set(clave, (conteoPorClave.get(clave) ?? 0) + 1)
      })
      const idPorClave = new Map()

      setProductos(data.map((p, i) => {
        const { label, nombreSinColor } = detectados[i]
        const clave = nombreSinColor.toLowerCase()
        let grupoVarianteId = null
        if (label && conteoPorClave.get(clave) >= 2) {
          if (!idPorClave.has(clave)) idPorClave.set(clave, crypto.randomUUID())
          grupoVarianteId = idPorClave.get(clave)
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
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Error al extraer productos'
      addToast(msg, 'error')
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
    const valor = Math.max(0, parseInt(stockGlobal, 10) || 0)
    setProductos(prev => prev.map(p => p._sel ? { ...p, stockActual: valor } : p))
    addToast('Stock aplicado a todos los seleccionados', 'success')
  }, [addToast, setProductos, stockGlobal])

  const aplicarMargenATodos = useCallback(() => {
    const pct = parseFloat(margenGlobal)
    if (isNaN(pct)) return
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

      const payload = seleccionados.map(p => ({
        nombreProducto:     p.nombreProducto,
        precioVenta:        p.precioVenta    ?? 0,
        precioCompra:       p.precioCompra   ?? 0,
        descripcionCorta:   p.descripcionCorta ?? '',
        imagenPrincipalUrl: p.imagenPrincipalUrl ?? null,
        marcaTexto:         p.marcaTexto ?? null,
        categoriaId:        p.categoriaId,
        marcaId:            p.marcaId    ?? null,
        bodegaId:           p.bodegaId   ?? bodegaId,
        stockActual:        parseInt(p.stockActual ?? 0, 10),
        condicion:          p.condicion  ?? 'NUEVO',
        grupoVarianteId:    p.grupoVarianteId ?? null,
        colorVariante:      p.colorVariante   ?? null,
      }))

      const res = await importService.confirmar(payload, esAdminIT ? Number(empresaSeleccionada) : null)
      const { ok, errores } = res.data?.data ?? {}
      addToast(`${ok} producto(s) importado(s) correctamente`, 'success')
      if (errores?.length) addToast(`${errores.length} con errores`, 'warning')
      navigate('/admin/productos')
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Error al importar'
      addToast(msg, 'error')
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
