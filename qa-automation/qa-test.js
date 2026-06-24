// QA automation para HOTCLICK — crawlea el panel admin completo y un flujo de
// compra pública (guest checkout vía SINPE), capturando errores de consola,
// excepciones de página y respuestas HTTP >= 400.
//
// Fase 1: login admin + ~50 rutas del panel /admin/*
// Fase 2: páginas públicas de contenido (nosotros, contacto, políticas, etc.)
// Fase 3: tienda pública como invitado — catálogo, carrito, checkout SINPE
// Fase 4: ruta protegida /mis-pedidos sin sesión (debe redirigir, no crashear)
// Fase 5: pruebas CRUD con datos dedicados (crea/edita/borra una marca y un
//         producto de prueba; corrige el estado del pedido SINPE de la fase 3)
//
// Solo modifica datos mediante registros nuevos claramente identificables
// como "QA TEST" — no edita ni borra nada preexistente.
//
// Uso:
//   npm install
//   npx playwright install chromium   (solo la primera vez)
//   npm test
//
// Variables de entorno opcionales:
//   QA_BASE_URL       (default http://localhost:8080)
//   QA_ADMIN_EMAIL     (default admin@hotclick.com)
//   QA_ADMIN_PASSWORD  (default Admin1234!)
//   HEADLESS=false     para ver el navegador mientras corre

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:8080';
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || 'admin@hotclick.com';
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || (() => { throw new Error('QA_ADMIN_PASSWORD env var is required') })();
const HEADLESS = process.env.HEADLESS !== 'false';
const RUN_TAG = Date.now().toString(36); // sufijo único para los datos de prueba

// PNG 1x1 transparente válido — usado como "comprobante" falso para el pedido de prueba SINPE.
const TEST_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

// Rutas del panel admin — lista completa tomada de App.jsx (no de la tabla
// resumida de CLAUDE.md, que solo cubre las principales).
const ADMIN_ROUTES = [
  { name: 'Admin · Dashboard', path: '/admin' },
  { name: 'Admin · Productos', path: '/admin/productos' },
  { name: 'Admin · Nuevo producto', path: '/admin/nuevo-producto' },
  { name: 'Admin · Pedidos', path: '/admin/pedidos' },
  { name: 'Admin · Categorías', path: '/admin/categorias' },
  { name: 'Admin · Bodegas', path: '/admin/bodegas' },
  { name: 'Admin · Nueva venta', path: '/admin/ventas' },
  { name: 'Admin · Finanzas', path: '/admin/finanzas' },
  { name: 'Admin · Finanzas (reporte contador)', path: '/admin/finanzas/reporte-contador' },
  { name: 'Admin · Reportes', path: '/admin/reportes' },
  { name: 'Admin · Publicaciones', path: '/admin/publicaciones' },
  { name: 'Admin · Marcas', path: '/admin/marcas' },
  { name: 'Admin · Configuración', path: '/admin/configuracion' },
  { name: 'Admin · Garantías', path: '/admin/garantias' },
  { name: 'Admin · Equipo', path: '/admin/equipo' },
  { name: 'Admin · Mi empresa', path: '/admin/mi-empresa' },
  { name: 'Admin · Usuarios', path: '/admin/usuarios' },
  { name: 'Admin · Pagos', path: '/admin/pagos' },
  { name: 'Admin · Solicitudes de servicio', path: '/admin/servicios' },
  { name: 'Admin · Testimonios', path: '/admin/testimonios' },
  { name: 'Admin · Empresas', path: '/admin/empresas' },
  { name: 'Admin · Aprobaciones', path: '/admin/aprobaciones' },
  { name: 'Admin · Centro de seguridad', path: '/admin/security' },
  { name: 'Admin · Superadmin', path: '/admin/superadmin' },
  { name: 'Admin · Observabilidad', path: '/admin/observabilidad' },
  { name: 'Admin · Control de IA', path: '/admin/ai-control' },
  { name: 'Admin · Facturas', path: '/admin/facturas' },
  { name: 'Admin · Configuración fiscal', path: '/admin/config-fiscal' },
  { name: 'Admin · Billing (planes)', path: '/admin/billing/planes' },
  { name: 'Admin · Billing (suscripción)', path: '/admin/billing/suscripcion' },
  { name: 'Admin · Cola offline', path: '/admin/offline/cola' },
  { name: 'Admin · Gift cards', path: '/admin/gift-cards' },
  { name: 'Admin · Cupones', path: '/admin/cupones' },
  { name: 'Admin · Branding', path: '/admin/branding' },
  { name: 'Admin · Homepage', path: '/admin/homepage' },
  { name: 'Admin · Plugins', path: '/admin/plugins' },
  { name: 'Admin · API keys', path: '/admin/api-keys' },
  { name: 'Admin · Inventario', path: '/admin/inventario' },
  { name: 'Admin · Copilot', path: '/admin/copilot' },
  { name: 'Admin · Forecast', path: '/admin/forecast' },
  { name: 'Admin · Executive', path: '/admin/executive' },
  { name: 'Admin · Multipaís', path: '/admin/multipais' },
  { name: 'Admin · Asignar compra', path: '/admin/asignar-compra' },
  { name: 'Admin · Ofertas', path: '/admin/ofertas' },
  { name: 'Admin · Blog', path: '/admin/blog' },
  { name: 'Admin · Convenios', path: '/admin/convenios' },
  { name: 'Admin · POS', path: '/admin/pos' },
  { name: 'Admin · POS caja', path: '/admin/pos/caja' },
  { name: 'Admin · POS historial', path: '/admin/pos/historial' },
  { name: 'Admin · Compras', path: '/admin/compras' },
  { name: 'Admin · Nueva compra', path: '/admin/compras/nueva' },
  { name: 'Admin · Proveedores', path: '/admin/proveedores' },
];

// Páginas públicas de contenido — bajo riesgo, solo se navega y se revisan errores.
const PUBLIC_INFO_ROUTES = [
  { name: 'Público · Nosotros', path: '/nosotros' },
  { name: 'Público · Contacto', path: '/contacto' },
  { name: 'Público · Información', path: '/informacion' },
  { name: 'Público · Privacidad', path: '/privacidad' },
  { name: 'Público · Términos', path: '/terminos' },
  { name: 'Público · Devoluciones', path: '/devoluciones' },
  { name: 'Público · Envíos', path: '/envios' },
  { name: 'Público · Cookies', path: '/cookies' },
  { name: 'Público · Servicios HOT', path: '/servicios' },
  { name: 'Público · Blog', path: '/blog' },
  { name: 'Público · Emprendimientos', path: '/emprendimientos' },
  { name: 'Público · Login (carga de página)', path: '/login' },
  { name: 'Público · Registro (carga de página)', path: '/registro' },
];

// ────────────────────────────────────────────────────────────────────────────
// Captura de errores por página
// ────────────────────────────────────────────────────────────────────────────
function attachErrorTracking(page) {
  const entries = [];
  let currentLabel = 'unknown';

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      entries.push({ label: currentLabel, type: 'console.error', detail: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    entries.push({ label: currentLabel, type: 'pageerror', detail: err.message });
  });
  page.on('requestfailed', (req) => {
    // Las peticiones abortadas por navegación SPA son ruido normal — se ignoran.
    const failure = req.failure()?.errorText || '';
    if (failure.includes('ERR_ABORTED')) return;
    entries.push({ label: currentLabel, type: 'requestfailed', detail: `${req.method()} ${req.url()} — ${failure}` });
  });
  page.on('response', (res) => {
    const status = res.status();
    if (status >= 400) {
      entries.push({ label: currentLabel, type: 'http', detail: `HTTP ${status} ${res.request().method()} ${res.url()}` });
    }
  });

  return {
    setLabel: (label) => { currentLabel = label; },
    entries,
  };
}

// El sitio muestra un popup promocional de bienvenida en la primera visita
// (PromoWelcomePopup.jsx) que bloquea clics hasta cerrarlo.
async function dismissPromoPopup(page) {
  try {
    // El popup aparece a los 2.5s (DELAY_MS en PromoWelcomePopup.jsx) — esperamos
    // más que eso para no adelantarnos y dejarlo aparecer después, sin cerrar.
    const closeBtn = page.getByRole('button', { name: /cerrar/i }).first();
    await closeBtn.waitFor({ state: 'visible', timeout: 4000 });
    await closeBtn.click();
  } catch { /* no había popup — normal en visitas siguientes (cooldown 7 días) */ }
}

// El panel admin muestra un tour guiado en la primera visita (AppTour.jsx,
// localStorage 'hc-admin-tour-v3-done') que también bloquea clics con un
// overlay a pantalla completa hasta omitirlo.
async function dismissAdminTour(page, timeout = 3000) {
  // "Omitir" solo existe en el primer paso; el botón "X" (aria-label="Cerrar
  // tour") cierra el tour desde cualquier paso — se intentan ambos.
  try {
    const closeBtn = page.getByLabel('Cerrar tour').first();
    await closeBtn.waitFor({ state: 'visible', timeout });
    await closeBtn.click();
    return;
  } catch { /* no estaba en ese estado */ }
  try {
    const skipBtn = page.getByRole('button', { name: /omitir/i }).first();
    await skipBtn.waitFor({ state: 'visible', timeout: 1000 });
    await skipBtn.click();
  } catch { /* no había tour — normal en sesiones siguientes */ }
}

async function fillIfVisible(page, labelRegex, value) {
  try {
    const loc = page.getByLabel(labelRegex).first();
    if ((await loc.count()) > 0 && (await loc.isVisible())) await loc.fill(value);
  } catch { /* campo no presente en este flujo — no es un error */ }
}

async function visitRoute(page, tracker, route, opts = {}) {
  tracker.setLabel(route.name);
  const result = { name: route.name, path: route.path, status: 'EXITOSO', notes: [] };
  try {
    const resp = await page.goto(BASE_URL + route.path, { waitUntil: 'networkidle', timeout: 20000 });
    if (resp && resp.status() >= 400) {
      result.notes.push(`HTTP ${resp.status()} al cargar la ruta`);
    }
    await page.waitForTimeout(700); // deja que la SPA dispare llamadas async y renderice
    if (opts.requireAuth) {
      const finalPath = new URL(page.url()).pathname;
      if (finalPath === '/login') {
        result.notes.push(`Redirigido silenciosamente a /login — la sesión admin se perdió en este punto del recorrido (esperaba quedarse en ${route.path})`);
      }
    }
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (/Something went wrong|Algo salió mal|Error inesperado|Cannot read propert|undefined is not/i.test(bodyText)) {
      result.notes.push('Texto de error visible en la página (posible error boundary de React)');
    }
  } catch (e) {
    result.notes.push(`Excepción de Playwright al navegar: ${e.message}`);
  }
  return result;
}

// Interacción genérica y NO destructiva en páginas admin con tablas/listas:
// si hay un input de búsqueda/filtro, escribe y borra texto para forzar una
// llamada a la API sin tocar botones de Crear/Editar/Eliminar/Guardar.
async function genericSafeInteraction(page, result) {
  try {
    const searchInput = page.locator('input[type="search"], input[placeholder*="uscar" i]').first();
    if ((await searchInput.count()) > 0 && (await searchInput.isVisible())) {
      await searchInput.fill('qa-test');
      await page.waitForTimeout(400);
      await searchInput.fill('');
      await page.waitForTimeout(400);
    }
  } catch (e) {
    result.notes.push(`Interacción de búsqueda falló: ${e.message}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 1 — Panel admin (login + ~50 rutas)
// ────────────────────────────────────────────────────────────────────────────
async function runAdminCrawl(page, tracker, results) {
  tracker.setLabel('Login admin');
  const loginResult = { name: 'Login admin', path: '/login', status: 'EXITOSO', notes: [] };
  try {
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
    await page.getByLabel(/correo electrónico/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (/credenciales|contraseña incorrecta|bloqueada/i.test(bodyText)) {
      loginResult.notes.push('El formulario reportó credenciales inválidas — revisa QA_ADMIN_EMAIL/QA_ADMIN_PASSWORD');
    } else {
      // Zustand persist (authStore "hotclick-auth") escribe el token en
      // localStorage poco después del login — si navegamos antes de que
      // termine esa escritura, la siguiente carga de página no encuentra
      // sesión y rebota a /login. Esperamos a que el token quede guardado.
      const tokenSaved = await page.waitForFunction(
        () => {
          try {
            const raw = localStorage.getItem('hotclick-auth');
            return raw && JSON.parse(raw)?.state?.accessToken;
          } catch { return false; }
        },
        null,
        { timeout: 8000 }
      ).catch(() => null);
      if (!tokenSaved) {
        loginResult.notes.push('El token de sesión no se guardó en localStorage tras el login (hotclick-auth) — posible condición de carrera en el persist de Zustand');
      }
    }
  } catch (e) {
    loginResult.notes.push(`No se pudo completar el login: ${e.message}`);
  }
  results.push(loginResult);

  await dismissAdminTour(page);

  for (const route of ADMIN_ROUTES) {
    const result = await visitRoute(page, tracker, route, { requireAuth: true });
    await genericSafeInteraction(page, result);
    results.push(result);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 2 — Páginas públicas de contenido
// ────────────────────────────────────────────────────────────────────────────
async function runPublicInfoCrawl(page, tracker, results) {
  for (const route of PUBLIC_INFO_ROUTES) {
    results.push(await visitRoute(page, tracker, route));
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3 — Tienda pública + compra de prueba (guest, pago SINPE — no toca Stripe real)
// ────────────────────────────────────────────────────────────────────────────
async function runPurchaseFlow(page, tracker, results) {
  results.push(await visitRoute(page, tracker, { name: 'Tienda · Home', path: '/' }));
  await dismissPromoPopup(page);
  results.push(await visitRoute(page, tracker, { name: 'Tienda · Catálogo', path: '/productos' }));

  tracker.setLabel('Tienda · Abrir detalle de producto');
  const productResult = { name: 'Tienda · Abrir detalle de producto', path: '(desde catálogo)', status: 'EXITOSO', notes: [] };
  try {
    // ProductCard.jsx navega con onClick={() => navigate(...)} sobre un <div>,
    // no con <a href> — por eso no se puede usar un selector de link real aquí.
    const firstProductCard = page.locator('.hc-card.cursor-pointer').first();
    await firstProductCard.waitFor({ timeout: 10000 });
    await firstProductCard.click();
    await page.waitForLoadState('networkidle');
    productResult.path = new URL(page.url()).pathname;
  } catch (e) {
    productResult.notes.push(`No se encontró ningún producto para abrir en /productos: ${e.message}`);
  }
  results.push(productResult);

  tracker.setLabel('Tienda · Agregar al carrito');
  const addResult = { name: 'Tienda · Agregar al carrito', path: new URL(page.url()).pathname, status: 'EXITOSO', notes: [] };
  try {
    const addBtn = page.getByRole('button', { name: /a(ñ|n)adir al carrito|agregar al carrito/i }).first();
    await addBtn.waitFor({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);
  } catch (e) {
    addResult.notes.push(`No se pudo agregar el producto al carrito: ${e.message}`);
  }
  results.push(addResult);

  results.push(await visitRoute(page, tracker, { name: 'Tienda · Carrito', path: '/carrito' }));

  tracker.setLabel('Tienda · Checkout (pedido de prueba SINPE)');
  const checkoutResult = { name: 'Tienda · Checkout (pedido de prueba SINPE)', path: '/checkout', status: 'EXITOSO', notes: [] };
  try {
    const goToCheckout = page.getByRole('button', { name: /finalizar compra|proceder al pago|ir a pagar|pagar con tarjeta/i }).first();
    await goToCheckout.waitFor({ timeout: 10000 });
    await goToCheckout.click();
    await page.waitForLoadState('networkidle');

    await page.getByText('SINPE Móvil', { exact: false }).first().click({ timeout: 5000 }).catch(() => {});

    await fillIfVisible(page, /correo/i, 'qa-bot@hotclick.test');
    await fillIfVisible(page, /nombre completo/i, 'QA Test Bot');
    await fillIfVisible(page, /c[eé]dula/i, '000000000');
    await fillIfVisible(page, /tel[eé]fono/i, '00000000');

    const fileInput = page.locator('input[type="file"]').first();
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles({
        name: 'comprobante-qa-test.png',
        mimeType: 'image/png',
        buffer: TEST_PNG_BUFFER,
      });
    }

    // Checkbox de consentimiento de datos (Ley 8968) — el botón de pago
    // queda disabled hasta marcarlo.
    const consentCheckbox = page.locator('input[type="checkbox"]').first();
    if ((await consentCheckbox.count()) > 0) await consentCheckbox.check();

    const payBtn = page.getByRole('button', { name: /pag[aá] con sinpe|finalizar compra/i }).first();
    await payBtn.click();
    await page.waitForTimeout(1200);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (!/pedido registrado|realiz[aá] tu sinpe|comprobante/i.test(bodyText)) {
      checkoutResult.notes.push('No se detectó la pantalla de confirmación de pedido tras enviar el formulario SINPE');
    }
  } catch (e) {
    checkoutResult.notes.push(`Fallo en el flujo de checkout: ${e.message}`);
  }
  results.push(checkoutResult);
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 4 — Ruta protegida sin sesión: debe redirigir, no crashear ni filtrar datos
// ────────────────────────────────────────────────────────────────────────────
async function runProtectedRouteCheck(page, tracker, results) {
  tracker.setLabel('Seguridad · /mis-pedidos sin sesión');
  const result = { name: 'Seguridad · /mis-pedidos sin sesión', path: '/mis-pedidos', status: 'EXITOSO', notes: [] };
  try {
    await page.goto(BASE_URL + '/mis-pedidos', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(500);
    const finalPath = new URL(page.url()).pathname;
    if (finalPath === '/mis-pedidos') {
      result.notes.push(`ProtectedRoute no redirigió a un visitante sin sesión (se quedó en ${finalPath})`);
    }
  } catch (e) {
    result.notes.push(`Excepción al verificar la ruta protegida: ${e.message}`);
  }
  results.push(result);
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 5 — CRUD con datos dedicados de prueba (no toca registros reales)
// ────────────────────────────────────────────────────────────────────────────
async function runCrudTests(page, tracker, results) {
  await runMarcaCrud(page, tracker, results);
  await runProductoCrud(page, tracker, results);
}

async function runMarcaCrud(page, tracker, results) {
  const marcaNombre = `QA TEST MARCA ${RUN_TAG}`;
  const marcaNombreEditado = `${marcaNombre} (editado)`;

  // El grid de marcas tarda en re-renderizar tras crear/editar/eliminar (el
  // refetch ocurre pero el repintado es lento en navegador headless) — en vez
  // de pelear contra ese timing, confirmamos cada paso por el toast de éxito
  // y verificamos el resultado final con una recarga completa de la página.
  tracker.setLabel('CRUD · Crear marca de prueba');
  const createResult = { name: 'CRUD · Crear marca de prueba', path: '/admin/marcas', status: 'EXITOSO', notes: [] };
  try {
    await page.goto(BASE_URL + '/admin/marcas', { waitUntil: 'networkidle' });
    if (new URL(page.url()).pathname === '/login') {
      throw new Error('la sesión admin ya no está activa (terminó en /login en vez de /admin/marcas)');
    }
    await page.getByRole('button', { name: /nueva marca/i }).click();
    await page.getByLabel(/nombre/i).first().fill(marcaNombre);
    await page.getByRole('button', { name: /crear marca/i }).click();
    await page.getByText(/marca guardada/i).waitFor({ timeout: 8000 });

    await page.goto(BASE_URL + '/admin/marcas', { waitUntil: 'networkidle' });
    const visible = await page.getByText(marcaNombre, { exact: false }).first().isVisible().catch(() => false);
    if (!visible) createResult.notes.push('La marca de prueba no aparece en la grilla tras crearla y recargar');
  } catch (e) {
    createResult.notes.push(`No se pudo crear la marca de prueba: ${e.message}`);
  }
  results.push(createResult);

  tracker.setLabel('CRUD · Editar marca de prueba');
  const editResult = { name: 'CRUD · Editar marca de prueba', path: '/admin/marcas', status: 'EXITOSO', notes: [] };
  try {
    const card = page.locator(`text="${marcaNombre}"`).first().locator('xpath=ancestor::div[contains(@class,"group")][1]');
    await card.hover();
    await card.getByTitle('Editar').click();
    const nameInput = page.getByLabel(/nombre/i).first();
    await nameInput.fill(marcaNombreEditado);
    await page.getByRole('button', { name: /guardar cambios/i }).click();
    await page.getByText(/marca guardada/i).waitFor({ timeout: 8000 });

    await page.goto(BASE_URL + '/admin/marcas', { waitUntil: 'networkidle' });
    const visible = await page.getByText(marcaNombreEditado, { exact: false }).first().isVisible().catch(() => false);
    if (!visible) editResult.notes.push('El nombre editado de la marca no se refleja en la grilla tras recargar');
  } catch (e) {
    editResult.notes.push(`No se pudo editar la marca de prueba: ${e.message}`);
  }
  results.push(editResult);

  tracker.setLabel('CRUD · Eliminar marca de prueba');
  const deleteResult = { name: 'CRUD · Eliminar marca de prueba', path: '/admin/marcas', status: 'EXITOSO', notes: [] };
  try {
    const card = page.locator(`text="${marcaNombreEditado}"`).first().locator('xpath=ancestor::div[contains(@class,"group")][1]');
    await card.hover();
    await card.getByTitle('Eliminar').click();
    await page.getByRole('button', { name: /eliminar marca|confirmar/i }).last().click();
    await page.getByText(/marca eliminada/i).waitFor({ timeout: 8000 });

    await page.goto(BASE_URL + '/admin/marcas', { waitUntil: 'networkidle' });
    const stillVisible = await page.getByText(marcaNombreEditado, { exact: false }).first().isVisible().catch(() => false);
    if (stillVisible) deleteResult.notes.push('La marca de prueba sigue visible tras eliminarla y recargar');
  } catch (e) {
    deleteResult.notes.push(`No se pudo eliminar la marca de prueba: ${e.message}`);
  }
  results.push(deleteResult);
}

async function runProductoCrud(page, tracker, results) {
  const productoNombre = `QA TEST PRODUCTO ${RUN_TAG}`;

  tracker.setLabel('CRUD · Crear producto de prueba');
  const createResult = { name: 'CRUD · Crear producto de prueba', path: '/admin/nuevo-producto', status: 'EXITOSO', notes: [] };
  try {
    await page.goto(BASE_URL + '/admin/nuevo-producto', { waitUntil: 'networkidle' });

    // El wizard exige subir al menos una foto y pasar por "Analizar imagen"
    // antes de mostrar el formulario manual (paso 2) — no hay forma de
    // saltarlo. Si el análisis IA falla (foto de prueba no es un producto
    // real), el código igual avanza al formulario con campos vacíos.
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'producto-qa-test.png',
      mimeType: 'image/png',
      buffer: TEST_PNG_BUFFER,
    });
    await page.getByRole('button', { name: /analizar imagen/i }).click();
    await page.getByText('Nombre del producto', { exact: false }).first().waitFor({ timeout: 20000 });

    // Este formulario usa un <Label> propio sin htmlFor/id (no es el componente
    // Input compartido), así que getByLabel no asocia el texto al campo — hay
    // que ubicar el <input> como hermano siguiente del texto de la etiqueta.
    const fieldAfterLabel = (labelText) =>
      page.getByText(labelText, { exact: false }).locator('xpath=following-sibling::input[1]');
    await fieldAfterLabel('Nombre del producto').fill(productoNombre);
    await fieldAfterLabel('Precio compra').fill('1000');
    await fieldAfterLabel('Precio venta al público').fill('2000');

    const categoriaSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Seleccionar' }) }).first();
    // Selecciona la categoría (índice 1 = primera opción real, índice 0 es el placeholder)
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i);
      const optionTexts = await sel.locator('option').allTextContents();
      if (optionTexts.some((t) => t.includes('Seleccionar'))) {
        await sel.selectOption({ index: 1 }).catch(() => {});
      }
    }

    await page.getByRole('button', { name: /guardar producto/i }).click();
    // Al crear con éxito, AdminNuevoProducto.jsx navega solo a /admin/productos.
    await page.waitForURL('**/admin/productos', { timeout: 10000 });
  } catch (e) {
    createResult.notes.push(`No se pudo crear el producto de prueba: ${e.message}`);
  }
  results.push(createResult);

  tracker.setLabel('CRUD · Eliminar producto de prueba');
  const deleteResult = { name: 'CRUD · Eliminar producto de prueba', path: '/admin/productos', status: 'EXITOSO', notes: [] };
  try {
    await page.goto(BASE_URL + '/admin/productos', { waitUntil: 'networkidle' });
    const searchInput = page.locator('input[placeholder*="uscar" i]').first();
    await searchInput.fill(productoNombre);
    await page.waitForTimeout(600);
    const row = page.getByText(productoNombre, { exact: false }).first();
    const found = await row.isVisible().catch(() => false);
    if (!found) {
      deleteResult.notes.push('El producto de prueba creado no aparece en el listado — revisa si la creación realmente funcionó');
    } else {
      await page.getByRole('button', { name: /eliminar producto/i }).first().click();
      await page.getByRole('button', { name: /eliminar|confirmar/i }).last().click();
      await page.getByText(/producto eliminado/i).waitFor({ timeout: 8000 }).catch(() => {});
      await page.goto(BASE_URL + '/admin/productos', { waitUntil: 'networkidle' });
      const stillVisible = await page.getByText(productoNombre, { exact: false }).first().isVisible().catch(() => false);
      if (stillVisible) deleteResult.notes.push('El producto de prueba sigue visible tras eliminarlo y recargar');
    }
  } catch (e) {
    deleteResult.notes.push(`No se pudo eliminar el producto de prueba: ${e.message}`);
  }
  results.push(deleteResult);
}

// Aplica una corrección manual de estado sobre el pedido de prueba SINPE
// creado en la Fase 3 (identificable por el nombre "QA Test Bot").
async function runPedidoStatusCorrection(page, tracker, results) {
  tracker.setLabel('CRUD · Corregir estado del pedido de prueba');
  const result = { name: 'CRUD · Corregir estado del pedido de prueba', path: '/admin/pedidos', status: 'EXITOSO', notes: [] };
  try {
    await page.goto(BASE_URL + '/admin/pedidos', { waitUntil: 'networkidle' });
    // AdminOrders.jsx no tiene input de búsqueda — el pedido de prueba debe
    // aparecer de entrada por ser el más reciente (orden descendente por fecha).
    await page.waitForTimeout(1500);
    const orderRow = page.getByText(/QA Test Bot/i).first();
    const found = await orderRow.isVisible().catch(() => false);
    if (!found) {
      result.notes.push('No se encontró el pedido de prueba "QA Test Bot" en el listado — puede que el checkout SINPE de esta corrida haya fallado antes');
    } else {
      await orderRow.click();
      await page.waitForTimeout(500);
      await page.getByText(/corrección manual/i).first().click();
      const select = page.locator('select').last();
      await select.selectOption({ label: 'CONFIRMADO' }).catch(() => select.selectOption({ index: 1 }));
      await page.getByRole('button', { name: /aplicar/i }).click();
      await page.waitForTimeout(800);
    }
  } catch (e) {
    result.notes.push(`No se pudo corregir el estado del pedido de prueba: ${e.message}`);
  }
  results.push(result);
}

// ────────────────────────────────────────────────────────────────────────────
// Reporte
// ────────────────────────────────────────────────────────────────────────────
function buildFinalReport(results, entries) {
  return results.map((r) => {
    const relatedErrors = entries
      .filter((e) => e.label === r.name)
      .map((e) => `[${e.type}] ${e.detail}`);
    const allNotes = [...r.notes, ...relatedErrors];
    return {
      name: r.name,
      path: r.path,
      status: allNotes.length > 0 ? 'ERROR' : 'EXITOSO',
      detalles: allNotes,
    };
  });
}

function printAndSaveReport(report) {
  const lines = [];
  lines.push('═'.repeat(78));
  lines.push(`HOTCLICK QA REPORT — ${new Date().toISOString()}`);
  lines.push(`Base URL: ${BASE_URL}`);
  lines.push('═'.repeat(78));

  let okCount = 0;
  let errCount = 0;

  for (const r of report) {
    const tag = r.status === 'EXITOSO' ? 'EXITOSO' : 'ERROR  ';
    if (r.status === 'EXITOSO') okCount++; else errCount++;
    lines.push('');
    lines.push(`[${tag}] ${r.name}  (${r.path})`);
    for (const d of r.detalles) lines.push(`    - ${d}`);
  }

  lines.push('');
  lines.push('─'.repeat(78));
  lines.push(`Total: ${report.length} pestañas/pasos · ${okCount} EXITOSO · ${errCount} ERROR`);
  lines.push('─'.repeat(78));

  const text = lines.join('\n');
  console.log(text);

  const reportsDir = path.join(__dirname, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(reportsDir, `log-${stamp}.txt`), text, 'utf8');
  fs.writeFileSync(path.join(reportsDir, `log-${stamp}.json`), JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(path.join(reportsDir, 'log.txt'), text, 'utf8'); // última corrida, nombre fijo

  return { okCount, errCount };
}

// ────────────────────────────────────────────────────────────────────────────
async function main() {
  const browser = await chromium.launch({ headless: HEADLESS });
  const results = [];
  let allEntries = [];

  // Sesión admin: login, panel completo, y CRUD de marca/producto justo después
  // (sin dejar pasar varios minutos de por medio, para no arriesgar que el
  // token de sesión quede en un estado raro tras una espera larga).
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const adminTracker = attachErrorTracking(adminPage);
  await runAdminCrawl(adminPage, adminTracker, results);
  await runCrudTests(adminPage, adminTracker, results);

  // Sesión de invitado: tienda pública + checkout + chequeo de ruta protegida.
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  const guestTracker = attachErrorTracking(guestPage);
  await runPublicInfoCrawl(guestPage, guestTracker, results);
  await runPurchaseFlow(guestPage, guestTracker, results);
  await runProtectedRouteCheck(guestPage, guestTracker, results);
  allEntries = allEntries.concat(guestTracker.entries);
  await guestContext.close();

  // De vuelta en la sesión admin: corregir el estado del pedido de prueba
  // SINPE recién creado por la sesión de invitado.
  await runPedidoStatusCorrection(adminPage, adminTracker, results);
  allEntries = allEntries.concat(adminTracker.entries);
  await adminContext.close();

  await browser.close();

  const report = buildFinalReport(results, allEntries);
  const { errCount } = printAndSaveReport(report);

  process.exit(errCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fallo fatal del script de QA:', e);
  process.exit(1);
});
