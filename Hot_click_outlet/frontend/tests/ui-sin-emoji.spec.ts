import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const dir = dirname(fileURLToPath(import.meta.url))

function leer(rel: string) {
  return readFileSync(join(dir, rel), 'utf8')
}

test('el tour del panel no usa caracteres decorativos', () => {
  const steps = leer('../src/components/ui/appTour/appTourSteps.ts')
  const ui = leer('../src/components/ui/AppTour.tsx')
  expect(steps).not.toContain('emoji:')
  expect(steps).not.toContain('🎉')
  expect(ui).toContain('Listo')
  expect(ui).not.toContain('🎉')
})

test('opiniones del perfil no usan emojis de UI', () => {
  const opiniones = leer('../src/pages/perfil/OpinionesSection.tsx')
  const testimonio = leer('../src/pages/perfil/TestimonioForm.tsx')
  const resena = leer('../src/pages/perfil/ResenaForm.tsx')
  expect(opiniones).toContain('Tu opinión')
  expect(opiniones).not.toContain('⭐')
  expect(opiniones).not.toContain('💬')
  expect(testimonio).not.toContain('🎉')
  expect(resena).not.toContain('🎉')
})

test('retiro y domicilio en i18n no usan emojis', () => {
  const es = leer('../src/i18n/locales/es.json')
  expect(es).toContain('"pickupBadge": "Retiro"')
  expect(es).not.toContain('🏪')
  expect(es).not.toContain('🚚')
})

test('placeholders de pedido y wishlist no usan caja emoji', () => {
  expect(leer('../src/components/ui/miniCart/MiniCartItems.tsx')).not.toContain('📦')
  expect(leer('../src/pages/WishlistPage.tsx')).not.toContain('📦')
  expect(leer('../src/pages/RecuperarCarritoPage.tsx')).not.toContain('🛒')
  expect(leer('../src/components/ui/ExitIntentModal.tsx')).not.toContain('🛒')
  expect(leer('../src/components/ui/ExitIntentModal.tsx')).not.toContain('❤️')
  expect(leer('../src/pages/admin/solicitudesGarantia/GarantiaList.tsx')).not.toContain('🛡️')
  expect(leer('../src/pages/admin/AdminObservabilidad.tsx')).not.toContain('icon="')
})

test('admin IA y forecast no usan emojis de UI', () => {
  const ai = leer('../src/pages/admin/AdminAiControl.tsx')
  const forecast = leer('../src/pages/admin/AdminForecast.tsx')
  const tour = leer('../src/components/ui/AppTour.tsx')
  expect(ai).not.toContain('💡')
  expect(ai).not.toContain('⚙️')
  expect(ai).not.toContain('📊')
  expect(forecast).not.toContain('📈')
  expect(forecast).not.toContain('▶')
  expect(tour).not.toContain('💡')
})

test('compra, login y mesas no usan emojis de UI', () => {
  expect(leer('../src/pages/perfil/ProfileOrdersCard.tsx')).not.toContain('📋')
  expect(leer('../src/pages/perfil/ProfileOrdersCard.tsx')).not.toContain('🛡')
  expect(leer('../src/components/ui/ReturnVisitorBanner.tsx')).not.toContain('👋')
  expect(leer('../src/pages/catalogo/OfertasView.tsx')).not.toContain('🔥')
  expect(leer('../src/pages/auth/LoginPageLayout.tsx')).not.toContain('🛍')
  expect(leer('../src/pages/auth/TwoFaPickerStep.tsx')).not.toContain('🔐')
  expect(leer('../src/pages/auth/TwoFaPickerStep.tsx')).not.toContain('📧')
  expect(leer('../src/pages/checkout/PaymentMethods.tsx')).not.toContain('💵')
  expect(leer('../src/pages/checkout/CheckoutSinpePending.tsx')).not.toContain('💰')
  expect(leer('../src/pages/checkout/ejecutarSubirComprobante.ts')).not.toContain('👋')
  expect(leer('../src/pages/admin/AdminMesas.tsx')).not.toContain('🪑')
  expect(leer('../src/pages/admin/AdminMesas.tsx')).not.toContain('📍')
})

test('servicios, convenios, executive y blog no usan emojis de UI', () => {
  expect(leer('../src/pages/admin/solicitudesServicio/ServicioList.tsx')).not.toContain('📋')
  expect(leer('../src/pages/admin/solicitudesServicio/servicioHelpers.ts')).not.toContain('👋')
  expect(leer('../src/pages/admin/solicitudesGarantia/garantiaHelpers.ts')).not.toContain('👋')
  expect(leer('../src/pages/admin/ordenes/ordenesHelpers.ts')).not.toContain('🙂')
  expect(leer('../src/pages/admin/AdminConvenios.tsx')).not.toContain('🤝')
  expect(leer('../src/pages/admin/AdminExecutive.tsx')).not.toContain('🤖')
  expect(leer('../src/pages/admin/plugins/PluginsList.tsx')).not.toContain('🪝')
  expect(leer('../src/pages/admin/AdminPlugins.tsx')).not.toContain('🔌')
  expect(leer('../src/pages/BlogPage.tsx')).not.toContain('📝')
  expect(leer('../src/pages/BlogPostPage.tsx')).not.toContain('📄')
  expect(leer('../src/pages/home/HomeMarcas.tsx')).not.toContain('🏷')
  expect(leer('../src/components/ui/accessibility/A11yPanelContent.tsx')).not.toContain('🌙')
  expect(leer('../src/pages/admin/AdminGiftCards.tsx')).not.toContain('🎁')
  expect(leer('../src/pages/admin/AdminOfertas.tsx')).not.toContain('🏷️')
  expect(leer('../src/pages/admin/configuracion/SeccionTienda.tsx')).not.toContain('📱')
})

test('POS y picker de categorías no pintan emojis de UI', () => {
  expect(leer('../src/components/pos/productSearch/posProductSearchHelpers.ts')).not.toContain('categoryEmoji')
  expect(leer('../src/components/pos/POSProductSearch.tsx')).not.toContain('👕')
  expect(leer('../src/components/pos/productSearch/ProductGrid.tsx')).not.toContain('📦')
  expect(leer('../src/components/pos/BodegaSelectorModal.tsx')).not.toContain('🏭')
  expect(leer('../src/components/pos/BodegaSelectorModal.tsx')).not.toContain('📦')
  expect(leer('../src/pages/pos/POSPagoPage.tsx')).not.toContain('💳')
  expect(leer('../src/pages/pos/POSPagoPage.tsx')).not.toContain('⏳')
  expect(leer('../src/pages/admin/pos/StepCobro.tsx')).not.toContain('⏳')
  expect(leer('../src/pages/admin/pos/StepCobro.tsx')).not.toContain('📲')
  expect(leer('../src/pages/admin/pos/StepQR.tsx')).not.toContain('⏳')
  expect(leer('../src/pages/admin/categorias/CategoriaFormModal.tsx')).not.toContain('👕')
  expect(leer('../src/pages/admin/categorias/CategoriaFormModal.tsx')).toContain('onCambiar(item.clave)')
  expect(leer('../src/pages/admin/categorias/CategoriaFormModal.tsx')).toContain('onSubmit={onSubmit}')
  expect(leer('../src/pages/admin/AdminCategories.tsx')).toContain('onSubmit={guardarCategoria}')
  expect(leer('../src/pages/catalogo/categoriaIconos.ts')).toContain('item.clave === icono')
  expect(leer('../src/pages/catalogo/CategorySidebar.tsx')).not.toContain('{drilledNode.icono')
  expect(leer('../src/pages/catalogo/SubcategoryGrid.tsx')).not.toContain('<span>{sub.icono}</span>')
  expect(leer('../src/components/layout/navbar/NavbarMobileCategorias.tsx')).not.toContain('${cat.icono')
  expect(leer('../src/pages/admin/categorias/CategoriaCard.tsx')).not.toContain('node.icono ||')
  expect(leer('../src/components/ui/PhoneField.tsx')).not.toContain('🌐')
  expect(leer('../src/components/ui/PhoneField.tsx')).not.toContain('fromCodePoint')
  expect(leer('../src/components/ui/PhoneField.tsx')).not.toContain('FlagEmoji')
  expect(leer('../src/components/ui/PhoneField.tsx')).not.toContain('FlagComponent')
  expect(leer('../src/components/ui/PhoneField.tsx')).toContain('onChange={onChange}')
  expect(leer('../src/components/ui/PhoneField.css')).toContain('attr(data-country)')
  expect(leer('../src/pages/auth/RegisterFormStep.tsx')).toContain('onChange={(val) => setForm(f => ({ ...f, telefono: val }))}')
  expect(leer('../src/pages/admin/AdminMultipais.tsx')).not.toContain('🌎')
})

test('toasts, i18n y pagos no usan cheques ni tarjeta-pronto', () => {
  expect(leer('../src/components/ui/Toast.tsx')).not.toContain("'✓'")
  expect(leer('../src/i18n/locales/es.json')).not.toContain('✓')
  expect(leer('../src/pages/home/ShippingSection.tsx')).not.toContain('soon')
  expect(leer('../src/pages/envios/enviosData.tsx')).not.toContain('próximo')
  expect(leer('../src/pages/admin/productos/BloqueContenido.tsx')).not.toContain('▶')
  expect(leer('../src/pages/admin/AdminInventario.tsx')).not.toContain('▶')
  expect(leer('../src/pages/pos/POSPagoPage.tsx')).not.toContain('⚠️')
  expect(leer('../src/pages/admin/SistemaInicio.tsx')).not.toContain('▲')
  expect(leer('../src/pages/producto/TitleAndBadges.tsx')).not.toContain('✓')
  expect(leer('../src/pages/informacion/ConditionsSection.tsx')).not.toContain('✓')
})

test('cierres y quitar usan CloseIcon, no cruz de carácter', () => {
  expect(leer('../src/components/ui/CloseIcon.tsx')).toContain('M6 18L18 6M6 6l12 12')
  expect(leer('../src/components/ui/Modal.tsx')).toContain('CloseIcon')
  expect(leer('../src/components/pos/POSPaymentPanel.tsx')).toContain('CloseIcon')
  expect(leer('../src/components/pos/POSPaymentPanel.tsx')).not.toContain('✕')
  expect(leer('../src/pages/admin/AdminWarehouses.tsx')).not.toContain('✕')
  expect(leer('../src/pages/admin/AdminWarehouses.tsx')).not.toContain('✎')
  expect(leer('../src/pages/admin/nuevo-producto/MultiUploadZone.tsx')).not.toContain('✕')
  expect(leer('../src/pages/admin/AdminNuevaCompra.tsx')).not.toContain('✕')
  expect(leer('../src/components/ui/MultiImagePicker.tsx')).not.toContain('✕')
  expect(leer('../src/pages/admin/blog/BlogEntryList.tsx')).not.toContain('×')
  expect(leer('../src/pages/admin/ordenes/CloseX.tsx')).toContain("from '@/components/ui/CloseIcon'")
  expect(leer('../src/components/ui/MiniCartDrawer.tsx')).toContain("from '@/components/ui/CloseIcon'")
  expect(leer('../src/components/ai/ChatModal.tsx')).toContain("from '@/components/ui/CloseIcon'")
  expect(leer('../src/pages/catalogo/CatalogFilterBar.tsx')).toContain("from '@/components/ui/CloseIcon'")
  expect(leer('../src/pages/catalogo/CatalogMobileSidebar.tsx')).toContain('aria-label="Cerrar"')
  expect(leer('../src/components/layout/navbar/navbarIcons.tsx')).toContain("from '@/components/ui/CloseIcon'")
  expect(leer('../src/components/ui/MiniCartDrawer.tsx')).not.toContain('M6 18L18 6M6 6l12 12')
  expect(leer('../src/components/ai/ChatModal.tsx')).not.toContain('M6 18L18 6M6 6l12 12')
})

test('estados y flechas de icono usan TrustGlyph, no cruz de carácter', () => {
  expect(leer('../src/components/ui/TrustGlyph.tsx')).toContain('atras:')
  expect(leer('../src/components/ui/TrustGlyph.tsx')).toContain('adelante:')
  expect(leer('../src/pages/pago/PagoError.tsx')).toContain('tipo="error"')
  expect(leer('../src/pages/pago/PagoError.tsx')).toContain('to="/checkout"')
  expect(leer('../src/pages/pago/PagoError.tsx')).not.toContain('M6 18L18 6')
  expect(leer('../src/pages/registrar-negocio/HaciendaVerificacion.tsx')).toContain('TrustGlyph')
  expect(leer('../src/pages/admin/AdminPlanes.tsx')).toContain('tipo="check"')
  expect(leer('../src/pages/admin/AdminPlanes.tsx')).not.toContain('M6 18L18 6')
  expect(leer('../src/pages/auth/RegisterVerifyStep.tsx')).toContain('tipo="alerta"')
  expect(leer('../src/pages/admin/productos/SeoStatusIcon.tsx')).toContain('tipo="error"')
  expect(leer('../src/pages/admin/productos/CarruselPanel.tsx')).not.toContain('←')
  expect(leer('../src/pages/admin/AdminNuevaCompra.tsx')).not.toContain('←')
  expect(leer('../src/pages/admin/reportes/VentasTab.tsx')).toContain('tipo="atras"')
})

test('flechas de copy en comprar vender emprender usan TextoFlecha', () => {
  expect(leer('../src/components/ui/TextoFlecha.tsx')).toContain('tipo="atras"')
  expect(leer('../src/components/ui/TextoFlecha.tsx')).toContain('tipo="adelante"')
  expect(leer('../src/components/ui/Section.tsx')).not.toContain('›')
  expect(leer('../src/pages/checkout/CheckoutLayout.tsx')).not.toContain('←')
  expect(leer('../src/pages/auth/LoginFormStep.tsx')).not.toContain('→')
  expect(leer('../src/pages/auth/EmprendimientoCloud.tsx')).not.toContain('→')
  expect(leer('../src/pages/registro-empresa/StepDatosEmpresa.tsx')).not.toContain('←')
  expect(leer('../src/pages/registro-empresa/StepDatosEmpresa.tsx')).not.toContain('→')
  expect(leer('../src/components/ui/AppTour.tsx')).not.toContain('←')
  expect(leer('../src/components/ui/AppTour.tsx')).not.toContain('→')
  expect(leer('../src/i18n/locales/es.json')).not.toContain('Ver todos →')
  expect(leer('../src/i18n/locales/es.json')).toContain('"verTodos": "Ver todos"')
  expect(leer('../src/i18n/locales/es.json')).toContain('flechas ← →')
  expect(leer('../src/pages/catalogo/CategoryRow.tsx')).toContain('<TextoFlecha')
  expect(leer('../src/pages/catalogo/CategoryRow.tsx')).not.toContain('M9 5l7 7-7 7')
  expect(leer('../src/pages/catalogo/CategoryRow.tsx')).toContain('onClick={() => onVerMas(catId)}')
  expect(leer('../src/pages/catalogo/ParentCategoryRow.tsx')).toContain('<TextoFlecha')
  expect(leer('../src/pages/catalogo/ParentCategoryRow.tsx')).not.toContain('M9 5l7 7-7 7')
  expect(leer('../src/pages/catalogo/ParentCategoryRow.tsx')).toContain('onClick={() => onVerMas(catId)}')
  expect(leer('../src/pages/catalogo/EmprendimientosRow.tsx')).toContain('onClick={onVerEmprendimientos}')
  expect(leer('../src/pages/catalogo/EmprendimientosRow.tsx')).not.toContain('M9 5l7 7-7 7')
  expect(leer('../src/pages/catalogo/CategorySidebar.tsx')).toContain('tipo="adelante"')
  expect(leer('../src/pages/catalogo/CategorySidebar.tsx')).toContain('onClick={() => handleCatSelect(String(cat.id))}')
  expect(leer('../src/pages/catalogo/CategorySidebar.tsx')).not.toContain('M9 5l7 7-7 7')
})

test('volver y canales de contacto usan TextoFlecha o TrustGlyph', () => {
  expect(leer('../src/pages/TerminosPage.tsx')).toContain('dir="atras"')
  expect(leer('../src/pages/TerminosPage.tsx')).toContain('to="/"')
  expect(leer('../src/pages/TerminosPage.tsx')).not.toContain('M15 19l-7-7 7-7')
  expect(leer('../src/pages/CookiesPage.tsx')).not.toContain('M15 19l-7-7 7-7')
  expect(leer('../src/pages/PrivacidadPage.tsx')).not.toContain('M15 19l-7-7 7-7')
  expect(leer('../src/pages/AcuerdoVendedoresPage.tsx')).not.toContain('M15 19l-7-7 7-7')
  expect(leer('../src/pages/devoluciones/DevolucionesHero.tsx')).not.toContain('M15 19l-7-7 7-7')
  expect(leer('../src/pages/envios/EnviosHero.tsx')).toContain('to="/"')
  expect(leer('../src/pages/envios/enviosIcons.tsx')).not.toContain('IconBack')
  expect(leer('../src/pages/MisPedidosPage.tsx')).toContain("onClick={() => navigate('/perfil')}")
  expect(leer('../src/pages/servicios/BotonVolver.tsx')).toContain('onClick={onClick}')
  expect(leer('../src/pages/servicios/ServiciosInicio.tsx')).toContain("onClick={() => irA('busqueda')}")
  expect(leer('../src/pages/servicios/ServiciosInicio.tsx')).toContain("onClick={() => irA('inventario')}")
  expect(leer('../src/pages/servicios/ServiciosInicio.tsx')).toContain('tipo="adelante"')
  expect(leer('../src/pages/contacto/ContactoCanales.tsx')).toContain('tipo="adelante"')
  expect(leer('../src/pages/contacto/ContactoCanales.tsx')).toContain('wa.me')
  expect(leer('../src/pages/EmpresaSelectionPage.tsx')).toContain('onClick={() => seleccionar(emp)}')
  expect(leer('../src/pages/admin/asignar/BuscarCliente.tsx')).toContain('onClick={() => onSelect(u)}')
})

test('flechas de copy en sistema admin y POS usan TextoFlecha', () => {
  expect(leer('../src/pages/admin/SistemaPosts.tsx')).not.toContain('←')
  expect(leer('../src/pages/admin/SistemaInicio.tsx')).not.toContain('→')
  expect(leer('../src/pages/admin/pagos/Pagination.tsx')).not.toContain('←')
  expect(leer('../src/pages/admin/pagos/Pagination.tsx')).not.toContain('→')
  expect(leer('../src/pages/admin/pos/StepCobro.tsx')).not.toContain('←')
  expect(leer('../src/pages/admin/pos/StepCobro.tsx')).toContain('onClick={onBack}')
  expect(leer('../src/pages/admin/pos/POSHeader.tsx')).not.toContain('←')
  expect(leer('../src/pages/admin/AdminOrders.tsx')).not.toContain('←')
  expect(leer('../src/pages/admin/productos/ProductosTableToolbar.tsx')).not.toContain('→')
  expect(leer('../src/pages/admin/nuevo-producto/WizardShell.tsx')).toContain('onSave')
})

test('secuencias y menús usan TextoCamino, no flecha de carácter', () => {
  expect(leer('../src/components/ui/TextoCamino.tsx')).toContain('tipo="adelante"')
  expect(leer('../src/pages/admin/ordenes/OrderCardExpanded.tsx')).not.toContain('→')
  expect(leer('../src/pages/admin/ordenes/OrderCardExpanded.tsx')).toContain('onClick={onSaveEstado}')
  expect(leer('../src/components/pos/BodegaSelectorModal.tsx')).not.toContain('→')
  expect(leer('../src/components/pos/BodegaSelectorModal.tsx')).toContain('onClick={handleConfirmar}')
  expect(leer('../src/components/pos/posCobro/PosClienteBusqueda.tsx')).not.toContain('→')
  expect(leer('../src/pages/admin/AdminHomepage.tsx')).not.toContain('→')
  expect(leer('../src/pages/admin/AdminHomepage.tsx')).toContain('onClick={handleSave}')
  expect(leer('../src/pages/admin/AdminReporteContador.tsx')).not.toContain('→')
  expect(leer('../src/components/ui/LanguageSelector.tsx')).not.toContain('→')
  expect(leer('../src/components/ui/LanguageSelector.tsx')).toContain('onClick={handleCycle}')
  expect(leer('../src/components/ui/appTour/appTourSteps.ts')).not.toContain('→')
  expect(leer('../src/pages/admin/AdminOfertas.tsx')).not.toContain('→ {fmt')
  expect(leer('../src/pages/admin/AdminOfertas.tsx')).toContain('ahora {fmt')
  expect(leer('../src/pages/admin/AdminOfertas.tsx')).toContain('onClick={handleApply}')
  expect(leer('../src/pages/admin/SistemaPromociones.tsx')).not.toContain('→ {formatPrice')
  expect(leer('../src/pages/admin/SistemaPromociones.tsx')).toContain('ahora {formatPrice')
  expect(leer('../src/pages/admin/SistemaPromociones.tsx')).toContain('onClick={handleApply}')
  expect(leer('../src/pages/admin/productos/BloqueSeo.tsx')).not.toContain('›')
  expect(leer('../src/pages/admin/productos/BloqueSeo.tsx')).not.toContain('ⓘ')
  expect(leer('../src/pages/admin/productos/BloqueSeo.tsx')).toContain('TextoCamino')
  expect(leer('../src/pages/admin/productos/BloqueSeo.tsx')).toContain('tipo="info"')
  expect(leer('../src/pages/admin/productos/BloqueSeo.tsx')).toContain('onClick={() => setSeoOpen((o) => !o)}')
  expect(leer('../src/pages/admin/productos/BloqueSeo.tsx')).toContain("setField(setForm, 'metaTitle'")
  expect(leer('../src/pages/admin/nuevo-producto/PasoSeo.tsx')).not.toContain('›')
  expect(leer('../src/pages/admin/nuevo-producto/PasoSeo.tsx')).toContain('TextoCamino')
  expect(leer('../src/pages/admin/nuevo-producto/PasoSeo.tsx')).toContain('onChange={e => handleTitleChange(e.target.value)}')
})

test('accesibilidad y destacados no usan engranaje ni estrella de carácter', () => {
  expect(leer('../src/components/ui/AccessibilityPanel.tsx')).toContain('A11yIcon')
  expect(leer('../src/components/ui/AccessibilityPanel.tsx')).not.toContain('⚙')
  expect(leer('../src/pages/admin/productos/ProductosTable.tsx')).toContain("'Dest.'")
  expect(leer('../src/pages/admin/productos/ProductosTable.tsx')).not.toContain('★')
})

test('el panel de accesibilidad abre sin engranaje de carácter', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Abrir opciones de accesibilidad' }).click()
  await expect(page.getByText('Alto contraste')).toBeVisible()
  await expect(page.getByText('⚙')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByText('Alto contraste')).toHaveCount(0)
})

test('el menú móvil abre y cierra con SVG, no con cruz de carácter', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.setViewportSize({ width: 375, height: 700 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const menu = page.getByRole('button', { name: 'Menú' })
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(menu.locator('svg')).toHaveCount(1)
  await expect(menu).not.toHaveText('✕')
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
})

test('el popup de bienvenida cierra con SVG, no con cruz de carácter', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(() => localStorage.removeItem('hc-promo-seen'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const cerrar = page.getByRole('dialog').getByRole('button', { name: 'Cerrar' })
  await expect(cerrar).toBeVisible({ timeout: 8000 })
  await expect(cerrar).not.toHaveText('✕')
  await expect(cerrar.locator('svg')).toHaveCount(1)
  await cerrar.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('más, reenviar y loader no usan caracteres decorativos', () => {
  expect(leer('../src/components/ui/TextoMas.tsx')).toContain('tipo="mas"')
  expect(leer('../src/components/ui/TrustGlyph.tsx')).toContain('reenviar:')
  expect(leer('../src/components/ui/Spinner.tsx')).toContain('tipo="bolsa"')
  expect(leer('../src/pages/auth/TwoFaEmailOtpStep.tsx')).not.toContain('↻')
  expect(leer('../src/pages/auth/TwoFaEmailOtpStep.tsx')).toContain('onClick={onResend}')
  expect(leer('../src/pages/admin/configuracion/PanelEmailOtp.tsx')).toContain('onClick={sendOtp}')
  expect(leer('../src/pages/admin/ordenes/OrderCardExpanded.tsx')).toContain('onClick={onSaveEstado}')
  expect(leer('../src/pages/admin/ordenes/OrderCardExpanded.tsx')).toContain('onClick={onConfirmDelete}')
  expect(leer('../src/pages/admin/SistemaInicio.tsx')).not.toContain('+ Agregá')
  expect(leer('../src/pages/admin/pos/StepRecibo.tsx')).toContain('onClick={onNueva}')
  expect(leer('../src/components/admin/ClienteDetailModal.tsx')).toContain('handleAjustarPuntos(1)')
  expect(leer('../src/pages/admin/categorias/formCategoria.ts')).not.toContain('↳')
  expect(leer('../src/pages/admin/categorias/formCategoria.ts')).toContain('(en ${nombrePadre})')
  expect(leer('../src/pages/admin/productos/ProductosFilters.tsx')).toContain('etiquetaOpcionPadre(c, categories)')
  expect(leer('../src/pages/admin/productos/ProductosFilters.tsx')).toContain('onChange={(e) => onFilterCat(e.target.value)}')
  expect(leer('../src/components/admin/CategoriaSelect.tsx')).not.toContain('↳')
  expect(leer('../src/components/admin/CategoriaSelect.tsx')).toContain('onChange={(e) => handleSelect(i + 1, e.target.value)}')
  expect(leer('../src/pages/admin/categorias/CategoriaFormModal.tsx')).toContain('onChange={onChange}')
  expect(leer('../src/components/ui/ExitIntentModal.tsx')).not.toContain('+ {preview.length - 3} más')
  expect(leer('../src/components/ui/ExitIntentModal.tsx')).toContain('y {preview.length - 3} más')
  expect(leer('../src/i18n/locales/es.json')).not.toContain('📸')
  expect(leer('../src/i18n/locales/es.json')).not.toContain('💾')
  expect(leer('../src/i18n/locales/es.json')).toContain('"orderCompleted": "Pedido completado"')
  expect(leer('../src/i18n/locales/es.json')).toContain('"newOrderBtn": "Nuevo pedido"')
})

test('solicitar búsqueda no usa emoji de cámara', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const link = page.getByRole('link', { name: 'Solicitar búsqueda' })
  await expect(link).toBeVisible()
  await expect(link).not.toHaveText('📸')
})

test('el teléfono del registro usa código ISO, no bandera emoji', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.goto('/registro', { waitUntil: 'domcontentloaded' })
  const pais = page.getByRole('combobox', { name: 'Country selector' })
  await expect(pais).toBeVisible()
  await expect(pais).toHaveAttribute('data-country', 'cr')
  await expect(pais.locator('img')).toBeHidden()
})

test('iniciar sesión usa chevron SVG, no flecha de carácter', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  const entrar = page.getByRole('button', { name: 'Iniciar sesión' })
  await expect(entrar).toBeVisible()
  await expect(entrar).not.toHaveText('→')
  await expect(entrar.locator('svg')).toHaveCount(1)
})

test('volver al inicio en términos usa chevron SVG', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.goto('/terminos', { waitUntil: 'domcontentloaded' })
  const volver = page.getByRole('link', { name: 'Volver al inicio' })
  await expect(volver).toBeVisible()
  await expect(volver.locator('svg')).toHaveCount(1)
  await volver.click()
  await expect(page).not.toHaveURL(/terminos/)
})

