import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const dir = dirname(fileURLToPath(import.meta.url))

function leer(rel) {
  return readFileSync(join(dir, rel), 'utf8')
}

test('el tour del panel no usa caracteres decorativos', () => {
  const steps = leer('../src/components/ui/appTour/appTourSteps.js')
  const ui = leer('../src/components/ui/AppTour.jsx')
  expect(steps).not.toContain('emoji:')
  expect(steps).not.toContain('🎉')
  expect(ui).toContain('Listo')
  expect(ui).not.toContain('🎉')
})

test('opiniones del perfil no usan emojis de UI', () => {
  const opiniones = leer('../src/pages/perfil/OpinionesSection.jsx')
  const testimonio = leer('../src/pages/perfil/TestimonioForm.jsx')
  const resena = leer('../src/pages/perfil/ResenaForm.jsx')
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
  expect(leer('../src/components/ui/miniCart/MiniCartItems.jsx')).not.toContain('📦')
  expect(leer('../src/pages/WishlistPage.jsx')).not.toContain('📦')
  expect(leer('../src/pages/RecuperarCarritoPage.jsx')).not.toContain('🛒')
  expect(leer('../src/components/ui/ExitIntentModal.jsx')).not.toContain('🛒')
  expect(leer('../src/components/ui/ExitIntentModal.jsx')).not.toContain('❤️')
  expect(leer('../src/pages/admin/solicitudesGarantia/GarantiaList.jsx')).not.toContain('🛡️')
  expect(leer('../src/pages/admin/AdminObservabilidad.jsx')).not.toContain('icon="')
})

test('admin IA y forecast no usan emojis de UI', () => {
  const ai = leer('../src/pages/admin/AdminAiControl.jsx')
  const forecast = leer('../src/pages/admin/AdminForecast.jsx')
  const tour = leer('../src/components/ui/AppTour.jsx')
  expect(ai).not.toContain('💡')
  expect(ai).not.toContain('⚙️')
  expect(ai).not.toContain('📊')
  expect(forecast).not.toContain('📈')
  expect(forecast).not.toContain('▶')
  expect(tour).not.toContain('💡')
})

test('compra, login y mesas no usan emojis de UI', () => {
  expect(leer('../src/pages/perfil/ProfileOrdersCard.jsx')).not.toContain('📋')
  expect(leer('../src/pages/perfil/ProfileOrdersCard.jsx')).not.toContain('🛡')
  expect(leer('../src/components/ui/ReturnVisitorBanner.jsx')).not.toContain('👋')
  expect(leer('../src/pages/catalogo/OfertasView.jsx')).not.toContain('🔥')
  expect(leer('../src/pages/auth/LoginPageLayout.jsx')).not.toContain('🛍')
  expect(leer('../src/pages/auth/TwoFaPickerStep.jsx')).not.toContain('🔐')
  expect(leer('../src/pages/auth/TwoFaPickerStep.jsx')).not.toContain('📧')
  expect(leer('../src/pages/checkout/PaymentMethods.jsx')).not.toContain('💵')
  expect(leer('../src/pages/checkout/CheckoutSinpePending.jsx')).not.toContain('💰')
  expect(leer('../src/pages/checkout/ejecutarSubirComprobante.js')).not.toContain('👋')
  expect(leer('../src/pages/admin/AdminMesas.jsx')).not.toContain('🪑')
  expect(leer('../src/pages/admin/AdminMesas.jsx')).not.toContain('📍')
})

test('servicios, convenios, executive y blog no usan emojis de UI', () => {
  expect(leer('../src/pages/admin/solicitudesServicio/ServicioList.jsx')).not.toContain('📋')
  expect(leer('../src/pages/admin/solicitudesServicio/servicioHelpers.js')).not.toContain('👋')
  expect(leer('../src/pages/admin/solicitudesGarantia/garantiaHelpers.js')).not.toContain('👋')
  expect(leer('../src/pages/admin/ordenes/ordenesHelpers.js')).not.toContain('🙂')
  expect(leer('../src/pages/admin/AdminConvenios.jsx')).not.toContain('🤝')
  expect(leer('../src/pages/admin/AdminExecutive.jsx')).not.toContain('🤖')
  expect(leer('../src/pages/admin/plugins/PluginsList.jsx')).not.toContain('🪝')
  expect(leer('../src/pages/admin/AdminPlugins.jsx')).not.toContain('🔌')
  expect(leer('../src/pages/BlogPage.jsx')).not.toContain('📝')
  expect(leer('../src/pages/BlogPostPage.jsx')).not.toContain('📄')
  expect(leer('../src/pages/home/HomeMarcas.jsx')).not.toContain('🏷')
  expect(leer('../src/components/ui/accessibility/A11yPanelContent.jsx')).not.toContain('🌙')
  expect(leer('../src/pages/admin/AdminGiftCards.jsx')).not.toContain('🎁')
  expect(leer('../src/pages/admin/AdminOfertas.jsx')).not.toContain('🏷️')
  expect(leer('../src/pages/admin/configuracion/SeccionTienda.jsx')).not.toContain('📱')
})

test('POS y picker de categorías no pintan emojis de UI', () => {
  expect(leer('../src/components/pos/productSearch/posProductSearchHelpers.js')).not.toContain('categoryEmoji')
  expect(leer('../src/components/pos/POSProductSearch.jsx')).not.toContain('👕')
  expect(leer('../src/components/pos/productSearch/ProductGrid.jsx')).not.toContain('📦')
  expect(leer('../src/components/pos/BodegaSelectorModal.jsx')).not.toContain('🏭')
  expect(leer('../src/components/pos/BodegaSelectorModal.jsx')).not.toContain('📦')
  expect(leer('../src/pages/pos/POSPagoPage.jsx')).not.toContain('💳')
  expect(leer('../src/pages/pos/POSPagoPage.jsx')).not.toContain('⏳')
  expect(leer('../src/pages/admin/pos/StepCobro.jsx')).not.toContain('⏳')
  expect(leer('../src/pages/admin/pos/StepCobro.jsx')).not.toContain('📲')
  expect(leer('../src/pages/admin/pos/StepQR.jsx')).not.toContain('⏳')
  expect(leer('../src/pages/admin/categorias/CategoriaFormModal.jsx')).not.toContain('👕')
  expect(leer('../src/pages/admin/categorias/CategoriaFormModal.jsx')).toContain('onCambiar(item.clave)')
  expect(leer('../src/pages/admin/categorias/CategoriaFormModal.jsx')).toContain('onSubmit={onSubmit}')
  expect(leer('../src/pages/admin/AdminCategories.jsx')).toContain('onSubmit={guardarCategoria}')
  expect(leer('../src/pages/catalogo/categoriaIconos.js')).toContain('item.clave === icono')
  expect(leer('../src/pages/catalogo/CategorySidebar.jsx')).not.toContain('{drilledNode.icono')
  expect(leer('../src/pages/catalogo/SubcategoryGrid.jsx')).not.toContain('<span>{sub.icono}</span>')
  expect(leer('../src/components/layout/navbar/NavbarMobileCategorias.jsx')).not.toContain('${cat.icono')
  expect(leer('../src/pages/admin/categorias/CategoriaCard.jsx')).not.toContain('node.icono ||')
  expect(leer('../src/components/ui/PhoneField.jsx')).not.toContain('🌐')
  expect(leer('../src/components/ui/PhoneField.jsx')).not.toContain('fromCodePoint')
  expect(leer('../src/components/ui/PhoneField.jsx')).not.toContain('FlagEmoji')
  expect(leer('../src/components/ui/PhoneField.jsx')).not.toContain('FlagComponent')
  expect(leer('../src/components/ui/PhoneField.jsx')).toContain('onChange={onChange}')
  expect(leer('../src/components/ui/PhoneField.css')).toContain('attr(data-country)')
  expect(leer('../src/pages/auth/RegisterFormStep.jsx')).toContain('onChange={(val) => setForm(f => ({ ...f, telefono: val }))}')
  expect(leer('../src/pages/admin/AdminMultipais.jsx')).not.toContain('🌎')
})

test('toasts, i18n y pagos no usan cheques ni tarjeta-pronto', () => {
  expect(leer('../src/components/ui/Toast.jsx')).not.toContain("'✓'")
  expect(leer('../src/i18n/locales/es.json')).not.toContain('✓')
  expect(leer('../src/pages/home/ShippingSection.jsx')).not.toContain('soon')
  expect(leer('../src/pages/envios/enviosData.jsx')).not.toContain('próximo')
  expect(leer('../src/pages/admin/productos/BloqueContenido.jsx')).not.toContain('▶')
  expect(leer('../src/pages/admin/AdminInventario.jsx')).not.toContain('▶')
  expect(leer('../src/pages/pos/POSPagoPage.jsx')).not.toContain('⚠️')
  expect(leer('../src/pages/admin/SistemaInicio.jsx')).not.toContain('▲')
  expect(leer('../src/pages/producto/TitleAndBadges.jsx')).not.toContain('✓')
  expect(leer('../src/pages/informacion/ConditionsSection.jsx')).not.toContain('✓')
})

test('cierres y quitar usan CloseIcon, no cruz de carácter', () => {
  expect(leer('../src/components/ui/CloseIcon.jsx')).toContain('M6 18L18 6M6 6l12 12')
  expect(leer('../src/components/ui/Modal.jsx')).toContain('CloseIcon')
  expect(leer('../src/components/pos/POSPaymentPanel.jsx')).toContain('CloseIcon')
  expect(leer('../src/components/pos/POSPaymentPanel.jsx')).not.toContain('✕')
  expect(leer('../src/pages/admin/AdminWarehouses.jsx')).not.toContain('✕')
  expect(leer('../src/pages/admin/AdminWarehouses.jsx')).not.toContain('✎')
  expect(leer('../src/pages/admin/nuevo-producto/MultiUploadZone.jsx')).not.toContain('✕')
  expect(leer('../src/pages/admin/AdminNuevaCompra.jsx')).not.toContain('✕')
  expect(leer('../src/components/ui/MultiImagePicker.jsx')).not.toContain('✕')
  expect(leer('../src/pages/admin/blog/BlogEntryList.jsx')).not.toContain('×')
  expect(leer('../src/pages/admin/ordenes/CloseX.jsx')).toContain("from '@/components/ui/CloseIcon'")
  expect(leer('../src/components/ui/MiniCartDrawer.jsx')).toContain("from '@/components/ui/CloseIcon'")
  expect(leer('../src/components/ai/ChatModal.jsx')).toContain("from '@/components/ui/CloseIcon'")
  expect(leer('../src/pages/catalogo/CatalogFilterBar.jsx')).toContain("from '@/components/ui/CloseIcon'")
  expect(leer('../src/pages/catalogo/CatalogMobileSidebar.jsx')).toContain('aria-label="Cerrar"')
  expect(leer('../src/components/layout/navbar/navbarIcons.jsx')).toContain("from '@/components/ui/CloseIcon'")
  expect(leer('../src/components/ui/MiniCartDrawer.jsx')).not.toContain('M6 18L18 6M6 6l12 12')
  expect(leer('../src/components/ai/ChatModal.jsx')).not.toContain('M6 18L18 6M6 6l12 12')
})

test('estados y flechas de icono usan TrustGlyph, no cruz de carácter', () => {
  expect(leer('../src/components/ui/TrustGlyph.jsx')).toContain('atras:')
  expect(leer('../src/components/ui/TrustGlyph.jsx')).toContain('adelante:')
  expect(leer('../src/pages/pago/PagoError.jsx')).toContain('tipo="error"')
  expect(leer('../src/pages/pago/PagoError.jsx')).toContain('to="/checkout"')
  expect(leer('../src/pages/pago/PagoError.jsx')).not.toContain('M6 18L18 6')
  expect(leer('../src/pages/registrar-negocio/HaciendaVerificacion.jsx')).toContain('TrustGlyph')
  expect(leer('../src/pages/admin/AdminPlanes.jsx')).toContain('tipo="check"')
  expect(leer('../src/pages/admin/AdminPlanes.jsx')).not.toContain('M6 18L18 6')
  expect(leer('../src/pages/auth/RegisterVerifyStep.jsx')).toContain('tipo="alerta"')
  expect(leer('../src/pages/admin/productos/SeoStatusIcon.jsx')).toContain('tipo="error"')
  expect(leer('../src/pages/admin/productos/CarruselPanel.jsx')).not.toContain('←')
  expect(leer('../src/pages/admin/AdminNuevaCompra.jsx')).not.toContain('←')
  expect(leer('../src/pages/admin/reportes/VentasTab.jsx')).toContain('tipo="atras"')
})

test('flechas de copy en comprar vender emprender usan TextoFlecha', () => {
  expect(leer('../src/components/ui/TextoFlecha.jsx')).toContain('tipo="atras"')
  expect(leer('../src/components/ui/TextoFlecha.jsx')).toContain('tipo="adelante"')
  expect(leer('../src/components/ui/Section.jsx')).not.toContain('›')
  expect(leer('../src/pages/checkout/CheckoutLayout.jsx')).not.toContain('←')
  expect(leer('../src/pages/auth/LoginFormStep.jsx')).not.toContain('→')
  expect(leer('../src/pages/auth/EmprendimientoCloud.jsx')).not.toContain('→')
  expect(leer('../src/pages/registro-empresa/StepDatosEmpresa.jsx')).not.toContain('←')
  expect(leer('../src/pages/registro-empresa/StepDatosEmpresa.jsx')).not.toContain('→')
  expect(leer('../src/components/ui/AppTour.jsx')).not.toContain('←')
  expect(leer('../src/components/ui/AppTour.jsx')).not.toContain('→')
  expect(leer('../src/i18n/locales/es.json')).not.toContain('Ver todos →')
  expect(leer('../src/i18n/locales/es.json')).toContain('"verTodos": "Ver todos"')
  expect(leer('../src/i18n/locales/es.json')).toContain('flechas ← →')
  expect(leer('../src/pages/catalogo/CategoryRow.jsx')).toContain('<TextoFlecha')
  expect(leer('../src/pages/catalogo/CategoryRow.jsx')).not.toContain('M9 5l7 7-7 7')
  expect(leer('../src/pages/catalogo/CategoryRow.jsx')).toContain('onClick={() => onVerMas(catId)}')
  expect(leer('../src/pages/catalogo/ParentCategoryRow.jsx')).toContain('<TextoFlecha')
  expect(leer('../src/pages/catalogo/ParentCategoryRow.jsx')).not.toContain('M9 5l7 7-7 7')
  expect(leer('../src/pages/catalogo/ParentCategoryRow.jsx')).toContain('onClick={() => onVerMas(catId)}')
  expect(leer('../src/pages/catalogo/EmprendimientosRow.jsx')).toContain('onClick={onVerEmprendimientos}')
  expect(leer('../src/pages/catalogo/EmprendimientosRow.jsx')).not.toContain('M9 5l7 7-7 7')
  expect(leer('../src/pages/catalogo/CategorySidebar.jsx')).toContain('tipo="adelante"')
  expect(leer('../src/pages/catalogo/CategorySidebar.jsx')).toContain('onClick={() => handleCatSelect(String(cat.id))}')
  expect(leer('../src/pages/catalogo/CategorySidebar.jsx')).not.toContain('M9 5l7 7-7 7')
})

test('volver y canales de contacto usan TextoFlecha o TrustGlyph', () => {
  expect(leer('../src/pages/TerminosPage.jsx')).toContain('dir="atras"')
  expect(leer('../src/pages/TerminosPage.jsx')).toContain('to="/"')
  expect(leer('../src/pages/TerminosPage.jsx')).not.toContain('M15 19l-7-7 7-7')
  expect(leer('../src/pages/CookiesPage.jsx')).not.toContain('M15 19l-7-7 7-7')
  expect(leer('../src/pages/PrivacidadPage.jsx')).not.toContain('M15 19l-7-7 7-7')
  expect(leer('../src/pages/AcuerdoVendedoresPage.jsx')).not.toContain('M15 19l-7-7 7-7')
  expect(leer('../src/pages/devoluciones/DevolucionesHero.jsx')).not.toContain('M15 19l-7-7 7-7')
  expect(leer('../src/pages/envios/EnviosHero.jsx')).toContain('to="/"')
  expect(leer('../src/pages/envios/enviosIcons.jsx')).not.toContain('IconBack')
  expect(leer('../src/pages/MisPedidosPage.jsx')).toContain("onClick={() => navigate('/perfil')}")
  expect(leer('../src/pages/servicios/BotonVolver.jsx')).toContain('onClick={onClick}')
  expect(leer('../src/pages/servicios/ServiciosInicio.jsx')).toContain("onClick={() => irA('busqueda')}")
  expect(leer('../src/pages/servicios/ServiciosInicio.jsx')).toContain('tipo="adelante"')
  expect(leer('../src/pages/contacto/ContactoCanales.jsx')).toContain('tipo="adelante"')
  expect(leer('../src/pages/contacto/ContactoCanales.jsx')).toContain('wa.me')
  expect(leer('../src/pages/EmpresaSelectionPage.jsx')).toContain('onClick={() => seleccionar(emp)}')
  expect(leer('../src/pages/admin/asignar/BuscarCliente.jsx')).toContain('onClick={() => onSelect(u)}')
})

test('flechas de copy en sistema admin y POS usan TextoFlecha', () => {
  expect(leer('../src/pages/admin/SistemaPosts.jsx')).not.toContain('←')
  expect(leer('../src/pages/admin/SistemaInicio.jsx')).not.toContain('→')
  expect(leer('../src/pages/admin/pagos/Pagination.jsx')).not.toContain('←')
  expect(leer('../src/pages/admin/pagos/Pagination.jsx')).not.toContain('→')
  expect(leer('../src/pages/admin/pos/StepCobro.jsx')).not.toContain('←')
  expect(leer('../src/pages/admin/pos/StepCobro.jsx')).toContain('onClick={onBack}')
  expect(leer('../src/pages/admin/pos/POSHeader.jsx')).not.toContain('←')
  expect(leer('../src/pages/admin/AdminOrders.jsx')).not.toContain('←')
  expect(leer('../src/pages/admin/productos/ProductosTableToolbar.jsx')).not.toContain('→')
  expect(leer('../src/pages/admin/nuevo-producto/WizardShell.jsx')).toContain('onSave')
})

test('secuencias y menús usan TextoCamino, no flecha de carácter', () => {
  expect(leer('../src/components/ui/TextoCamino.jsx')).toContain('tipo="adelante"')
  expect(leer('../src/pages/admin/ordenes/OrderCardExpanded.jsx')).not.toContain('→')
  expect(leer('../src/pages/admin/ordenes/OrderCardExpanded.jsx')).toContain('onClick={onSaveEstado}')
  expect(leer('../src/components/pos/BodegaSelectorModal.jsx')).not.toContain('→')
  expect(leer('../src/components/pos/BodegaSelectorModal.jsx')).toContain('onClick={handleConfirmar}')
  expect(leer('../src/components/pos/posCobro/PosClienteBusqueda.jsx')).not.toContain('→')
  expect(leer('../src/pages/admin/AdminHomepage.jsx')).not.toContain('→')
  expect(leer('../src/pages/admin/AdminHomepage.jsx')).toContain('onClick={handleSave}')
  expect(leer('../src/pages/admin/AdminReporteContador.jsx')).not.toContain('→')
  expect(leer('../src/components/ui/LanguageSelector.jsx')).not.toContain('→')
  expect(leer('../src/components/ui/LanguageSelector.jsx')).toContain('onClick={handleCycle}')
  expect(leer('../src/components/ui/appTour/appTourSteps.js')).not.toContain('→')
  expect(leer('../src/pages/admin/AdminOfertas.jsx')).not.toContain('→ {fmt')
  expect(leer('../src/pages/admin/AdminOfertas.jsx')).toContain('ahora {fmt')
  expect(leer('../src/pages/admin/AdminOfertas.jsx')).toContain('onClick={handleApply}')
  expect(leer('../src/pages/admin/SistemaPromociones.jsx')).not.toContain('→ {formatPrice')
  expect(leer('../src/pages/admin/SistemaPromociones.jsx')).toContain('ahora {formatPrice')
  expect(leer('../src/pages/admin/SistemaPromociones.jsx')).toContain('onClick={handleApply}')
  expect(leer('../src/pages/admin/productos/BloqueSeo.jsx')).not.toContain('›')
  expect(leer('../src/pages/admin/productos/BloqueSeo.jsx')).not.toContain('ⓘ')
  expect(leer('../src/pages/admin/productos/BloqueSeo.jsx')).toContain('TextoCamino')
  expect(leer('../src/pages/admin/productos/BloqueSeo.jsx')).toContain('tipo="info"')
  expect(leer('../src/pages/admin/productos/BloqueSeo.jsx')).toContain('onClick={() => setSeoOpen((o) => !o)}')
  expect(leer('../src/pages/admin/productos/BloqueSeo.jsx')).toContain("setField(setForm, 'metaTitle'")
  expect(leer('../src/pages/admin/nuevo-producto/PasoSeo.jsx')).not.toContain('›')
  expect(leer('../src/pages/admin/nuevo-producto/PasoSeo.jsx')).toContain('TextoCamino')
  expect(leer('../src/pages/admin/nuevo-producto/PasoSeo.jsx')).toContain('onChange={e => handleTitleChange(e.target.value)}')
})

test('accesibilidad y destacados no usan engranaje ni estrella de carácter', () => {
  expect(leer('../src/components/ui/AccessibilityPanel.jsx')).toContain('A11yIcon')
  expect(leer('../src/components/ui/AccessibilityPanel.jsx')).not.toContain('⚙')
  expect(leer('../src/pages/admin/productos/ProductosTable.jsx')).toContain("'Dest.'")
  expect(leer('../src/pages/admin/productos/ProductosTable.jsx')).not.toContain('★')
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
  expect(leer('../src/components/ui/TextoMas.jsx')).toContain('tipo="mas"')
  expect(leer('../src/components/ui/TrustGlyph.jsx')).toContain('reenviar:')
  expect(leer('../src/components/ui/Spinner.jsx')).toContain('tipo="bolsa"')
  expect(leer('../src/pages/auth/TwoFaEmailOtpStep.jsx')).not.toContain('↻')
  expect(leer('../src/pages/auth/TwoFaEmailOtpStep.jsx')).toContain('onClick={onResend}')
  expect(leer('../src/pages/admin/configuracion/PanelEmailOtp.jsx')).toContain('onClick={sendOtp}')
  expect(leer('../src/pages/admin/ordenes/OrderCardExpanded.jsx')).toContain('onClick={onSaveEstado}')
  expect(leer('../src/pages/admin/ordenes/OrderCardExpanded.jsx')).toContain('onClick={onConfirmDelete}')
  expect(leer('../src/pages/admin/SistemaInicio.jsx')).not.toContain('+ Agregá')
  expect(leer('../src/pages/admin/pos/StepRecibo.jsx')).toContain('onClick={onNueva}')
  expect(leer('../src/components/admin/ClienteDetailModal.jsx')).toContain('handleAjustarPuntos(1)')
  expect(leer('../src/pages/admin/categorias/formCategoria.js')).not.toContain('↳')
  expect(leer('../src/pages/admin/categorias/formCategoria.js')).toContain('(en ${nombrePadre})')
  expect(leer('../src/pages/admin/productos/ProductosFilters.jsx')).toContain('etiquetaOpcionPadre(c, categories)')
  expect(leer('../src/pages/admin/productos/ProductosFilters.jsx')).toContain('onChange={(e) => onFilterCat(e.target.value)}')
  expect(leer('../src/components/admin/CategoriaSelect.jsx')).not.toContain('↳')
  expect(leer('../src/components/admin/CategoriaSelect.jsx')).toContain('onChange={(e) => handleSelect(i + 1, e.target.value)}')
  expect(leer('../src/pages/admin/categorias/CategoriaFormModal.jsx')).toContain('onChange={onChange}')
  expect(leer('../src/components/ui/ExitIntentModal.jsx')).not.toContain('+ {preview.length - 3} más')
  expect(leer('../src/components/ui/ExitIntentModal.jsx')).toContain('y {preview.length - 3} más')
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

