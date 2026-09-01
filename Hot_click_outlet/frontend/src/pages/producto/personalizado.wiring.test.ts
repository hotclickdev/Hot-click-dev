import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('productos personalizados — wiring estático', () => {
  it('expone ruta pública /encargo/:token y admin /encargos', () => {
    const routes = readFileSync(resolve(root, 'src/app/AppRoutes.tsx'), 'utf8')
    expect(routes).toContain('/encargo/:token')
    expect(routes).toContain('path="encargos"')
    expect(routes).toContain('EncargoPublicPage')
    expect(routes).toContain('AdminEncargos')
  })

  it('wizard incluye toggle de producto personalizado', () => {
    const paso = readFileSync(resolve(root, 'src/pages/admin/nuevo-producto/PasoPrecios.tsx'), 'utf8')
    expect(paso).toContain('esPersonalizado')
    expect(paso).toContain('COTIZACION')
    expect(paso).toContain('Producto personalizado')
  })

  it('detalle de producto monta PersonalizacionPanel', () => {
    const info = readFileSync(resolve(root, 'src/pages/producto/ProductInfo.tsx'), 'utf8')
    expect(info).toContain('PersonalizacionPanel')
    expect(info).toContain('Solicitar encargo')
  })

  it('checkout envía personalizacion en el payload', () => {
    const checkout = readFileSync(resolve(root, 'src/pages/checkout/ejecutarPagarCheckout.ts'), 'utf8')
    expect(checkout).toContain('personalizacion')
    expect(checkout).toContain('imagenes')
  })

  it('encargoService apunta a endpoints públicos y admin', () => {
    const svc = readFileSync(resolve(root, 'src/services/encargoService.ts'), 'utf8')
    expect(svc).toContain('/public/encargos/imagenes')
    expect(svc).toContain('/public/encargos')
    expect(svc).toContain('/encargos/')
    expect(svc).toContain('aprobar')
    expect(svc).toContain('rechazar')
  })

  it('Mis Productos pide elegir tipo al agregar', () => {
    const routes = readFileSync(resolve(root, 'src/prototipo/emprendedor/EmprendedorRoutes.tsx'), 'utf8')
    expect(routes).toContain('ElegirTipoProductoPage')
    expect(routes).toContain('productos/nuevo/personalizado')
    const elegir = readFileSync(resolve(root, 'src/prototipo/emprendedor/pages/ElegirTipoProductoPage.tsx'), 'utf8')
    expect(elegir).toContain('Producto de catálogo')
    expect(elegir).toContain('Producto personalizado')
  })
})
