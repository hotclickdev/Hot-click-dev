// QA automation para HOTCLICK — crawlea el panel admin y un flujo de compra pública
// (guest checkout vía SINPE) capturando errores de consola, excepciones de página y
// respuestas HTTP >= 400. No modifica/borra datos existentes: solo crea UN pedido de
// prueba nuevo durante el flujo de compra (claramente identificable como "QA Test Bot").
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
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || 'Admin1234!';
const HEADLESS = process.env.HEADLESS !== 'false';

// PNG 1x1 transparente válido — usado como "comprobante" falso para el pedido de prueba SINPE.
const TEST_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

const ADMIN_ROUTES = [
  { name: 'Admin · Dashboard', path: '/admin' },
  { name: 'Admin · Productos', path: '/admin/productos' },
  { name: 'Admin · Nuevo producto', path: '/admin/productos/nuevo' },
  { name: 'Admin · Pedidos', path: '/admin/pedidos' },
  { name: 'Admin · Marcas', path: '/admin/marcas' },
  { name: 'Admin · Finanzas', path: '/admin/finanzas' },
  { name: 'Admin · Usuarios', path: '/admin/usuarios' },
  { name: 'Admin · Reportes', path: '/admin/reportes' },
  { name: 'Admin · Publicaciones', path: '/admin/publicaciones' },
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
    const closeBtn = page.getByRole('button', { name: /cerrar/i }).first();
    if (await closeBtn.isVisible({ timeout: 2000 })) await closeBtn.click();
  } catch { /* no había popup — normal en visitas siguientes */ }
}

async function fillIfVisible(page, labelRegex, value) {
  try {
    const loc = page.getByLabel(labelRegex).first();
    if ((await loc.count()) > 0 && (await loc.isVisible())) await loc.fill(value);
  } catch { /* campo no presente en este flujo — no es un error */ }
}

async function visitRoute(page, tracker, route) {
  tracker.setLabel(route.name);
  const result = { name: route.name, path: route.path, status: 'EXITOSO', notes: [] };
  try {
    const resp = await page.goto(BASE_URL + route.path, { waitUntil: 'networkidle', timeout: 20000 });
    if (resp && resp.status() >= 400) {
      result.notes.push(`HTTP ${resp.status()} al cargar la ruta`);
    }
    await page.waitForTimeout(700); // deja que la SPA dispare llamadas async y renderice
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
// Fase 1 — Panel admin
// ────────────────────────────────────────────────────────────────────────────
async function runAdminCrawl(context) {
  const page = await context.newPage();
  const tracker = attachErrorTracking(page);
  const results = [];

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
    }
  } catch (e) {
    loginResult.notes.push(`No se pudo completar el login: ${e.message}`);
  }
  results.push(loginResult);

  for (const route of ADMIN_ROUTES) {
    const result = await visitRoute(page, tracker, route);
    await genericSafeInteraction(page, result);
    results.push(result);
  }

  await page.close();
  return { results, entries: tracker.entries };
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 2 — Tienda pública + compra de prueba (guest, pago SINPE — no toca Stripe real)
// ────────────────────────────────────────────────────────────────────────────
async function runPurchaseFlow(context) {
  const page = await context.newPage();
  const tracker = attachErrorTracking(page);
  const results = [];

  results.push(await visitRoute(page, tracker, { name: 'Tienda · Home', path: '/' }));
  await dismissPromoPopup(page);
  results.push(await visitRoute(page, tracker, { name: 'Tienda · Catálogo', path: '/productos' }));

  tracker.setLabel('Tienda · Abrir detalle de producto');
  const productResult = { name: 'Tienda · Abrir detalle de producto', path: '(desde catálogo)', status: 'EXITOSO', notes: [] };
  try {
    const firstProductLink = page.locator('a[href^="/productos/"]').first();
    await firstProductLink.waitFor({ timeout: 10000 });
    await firstProductLink.click();
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

  await page.close();
  return { results, entries: tracker.entries };
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

  const adminContext = await browser.newContext();
  const adminRun = await runAdminCrawl(adminContext);
  await adminContext.close();

  const storeContext = await browser.newContext();
  const storeRun = await runPurchaseFlow(storeContext);
  await storeContext.close();

  await browser.close();

  const allResults = [...adminRun.results, ...storeRun.results];
  const allEntries = [...adminRun.entries, ...storeRun.entries];
  const report = buildFinalReport(allResults, allEntries);
  const { errCount } = printAndSaveReport(report);

  process.exit(errCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fallo fatal del script de QA:', e);
  process.exit(1);
});
