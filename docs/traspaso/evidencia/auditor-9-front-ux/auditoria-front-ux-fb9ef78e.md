# Auditoría Front y UX — HotClick @ fb9ef78e (master)

Modo: solo lectura, análisis estático de `Hot_click_outlet/frontend/src` (React 19 + Vite + Tailwind). Sin build, sin servidor, sin requests a prod. La revisión a 360 px se hizo leyendo el CSS y las clases, no en un navegador. Fecha: 25 oct 2026 (hora de Costa Rica, UTC-6).

## Resumen
| Prioridad | Correcciones |
|---|---|
| ALTO | 2 |
| MEDIO | 5 |
| BAJO | 3 |
| **Total** | **10** |

Mejoras: 6.

Lo que está bien (verificado): las rutas cargan con `lazy()` (84 en `app/AppRoutes.tsx`), `index.html` no bloquea el zoom, y `utils/format.ts` centraliza ₡ con punto de miles.

---
## 1) CORRECCIONES

### C1 — ALTO — En una cotización en USD, el subtotal de cada línea sale en colones
- **Archivo:** `pages/admin/nueva-cotizacion/ItemRow.tsx:112`
- **Evidencia:** `{formatMonto(subtotal)}`: no pasa `moneda`, así que usa el valor por defecto `'CRC'` (`services/cotizacionService.ts:41`). Los totales sí la pasan (`SeccionTotales.tsx:53`: `formatMonto(subtotal, form.moneda)`).
- **Riesgo:** en la misma pantalla, cada línea muestra ₡ y el total muestra US$, y el cliente puede recibir montos que no cuadran.
- **Cómo reproducirlo:** Nueva cotización → Moneda «$ Dólares (USD)» → agregá un ítem de 50 → la línea dice «₡50» y el total dice «$0.50».
- **Corrección:** pasar `moneda` a `ItemRow` y usar `formatMonto(subtotal, moneda)`.
- **Garantía que afecta:** claridad de montos y confianza.

### C2 — ALTO — En USD, las unidades de captura y de visualización no coinciden (centavos frente a dólares)
- **Archivos:** `services/cotizacionService.ts:43`, `pages/admin/nueva-cotizacion/ItemRow.tsx:101-102` y `:35`
- **Evidencia:** al mostrar se divide `.format((monto ?? 0) / 100)`, pero el input guarda el número tal cual (`precioUnitario: Number(e.target.value)`), sin `*100`. Además, al elegir un producto se copia `precioUnitario: p.precioVenta` (precio en colones) aunque la cotización sea en USD.
- **Riesgo:** si alguien escribe 50 queriendo decir US$50, se muestra «$0.50». Un producto de ₡10.000 entra como «$100.00». Puede salir una cotización con montos 100 veces menores o en la moneda equivocada.
- **Cómo reproducirlo:** el mismo flujo de C1. Mirá el total en USD y después agregá un producto del catálogo.
- **Corrección:** definir una sola unidad (centavos para las dos monedas o unidades para las dos), convertir en el input (`Math.round(v*100)`) y convertir con el tipo de cambio al elegir un producto, o bloquear el autollenado en USD. Antes hay que confirmar con backend qué unidad espera (no lo verifiqué en el backend).
- **Garantía que afecta:** claridad de montos y confianza.

### C3 — MEDIO — US$ con tres formatos distintos
- **Evidencia:**
  - `services/cotizacionService.ts:43` → `Intl.NumberFormat('en-US', {currency:'USD'})` → «$1,234.56» (sin «US$», con coma de miles)
  - `config/planesPrecios.ts:24` → `` `US$${...toFixed(2).replace('.', ',')}` `` → «US$9,50»
  - `pages/admin/suscripcion/suscripcionHelpers.ts:43` → `` `US$ ${(c/100).toFixed(2)}` `` → «US$ 9.50» (sin miles; con otra moneda imprime el código crudo)
- **Riesgo:** el mismo plan aparece con precios escritos distinto en la landing y en la factura. Además, «$» se confunde con ₡ o con otras monedas.
- **Corrección:** una sola función `formatUsd()` en `utils/format.ts` (por ejemplo `es-CR` con prefijo «US$», punto de miles y coma decimal, igual que ₡) usada en los 3 lugares.
- **Garantía que afecta:** claridad de montos.

### C4 — MEDIO — ₡ formateado de dos maneras (NBSP frente a punto)
- **Evidencia:** `utils/format.ts:15` reemplaza el separador por «.» («₡6.200»), pero hay unas 22 funciones `fmt` locales con `new Intl.NumberFormat('es-CR').format(n)`, que en es-CR usa espacio duro («₡6 200»). Ejemplos: `components/pos/POSReceipt.tsx:4`, `pages/admin/compras/comprasHelpers.ts:3`, `components/admin/clienteDetail/clienteDetailHelpers.ts:1`, `pages/admin/pos/posHelpers.ts:165`. `PasoPrecios.tsx:75` y `BloquePrecios.tsx:25` usan `toLocaleString('es-CR')`.
- **Riesgo:** el recibo del POS y el sitio público muestran el mismo monto escrito distinto. Las líneas `₡{fmt(x)}` repiten el símbolo a mano.
- **Cómo reproducirlo:** comparar un monto de 4 dígitos o más en el recibo del POS y en la ficha de producto.
- **Corrección:** borrar las `fmt` locales y usar `formatPrice` de `utils/format.ts` (agregar una variante con decimales si hace falta).
- **Garantía que afecta:** claridad de montos.

### C5 — MEDIO — Mensajes crudos del backend o de JS mostrados al usuario
- **Evidencia:**
  - `pages/checkout/TilopayCardForm.tsx:81-84`: `err instanceof Error && err.message ? err.message : t('checkout.tilopayPayError')` → toast con el `message` técnico (por ejemplo «Network Error» o «Request failed with status code 500») en pleno pago.
  - `pages/admin/configuracion/configUi.tsx:37`: hace fallback a `e.message`.
  - `components/auth/WebAuthnStep.tsx:14` y `components/admin/AdminWebAuthnSetup.tsx:9`: `e.response?.data?.error || e.message`.
  - Hay 29 usos de `err.message` / `response?.data` en .tsx.
- **Riesgo:** mensajes en inglés y técnicos justo en el checkout, que bajan la confianza.
- **Cómo reproducirlo:** cortar la red justo antes de «Pagar» en el checkout con Tilopay.
- **Corrección:** mapear los errores a textos i18n según código o status. Mostrar `err.message` solo si es un error de dominio conocido. Mandar el detalle a Sentry.
- **Garantía que afecta:** confianza y claridad de errores.

### C6 — MEDIO — Modales sin scroll interno ni `role="dialog"`: a 360 px el contenido queda inaccesible
- **Evidencia:** `pages/admin/nueva-cotizacion/ModalCliente.tsx:51-52` y `pages/admin/proveedores/ProveedorFormModal.tsx:24-26`: `fixed inset-0 ... flex items-center` + `p-6`, sin `max-h-*` ni `overflow-y-auto` (0 apariciones en esos archivos). De 36 archivos con `fixed inset-0`, varios no tienen `role="dialog"`/`aria-modal` (también `ProveedoresTable.tsx:77`, `GlobalSearch.tsx:117`, `ImportPreviewModal.tsx:31`).
- **Riesgo:** en un celular de 360×640 con el teclado abierto, la parte de abajo del formulario (los botones Guardar/Cancelar) queda fuera de la pantalla y no se puede alcanzar. El lector de pantalla no anuncia el modal y el foco no queda atrapado en él.
- **Cómo reproducirlo:** viewport de 360 px → abrir «Nuevo cliente» en una cotización → enfocar un input.
- **Corrección:** un componente `Modal` común con `max-h-[90dvh] overflow-y-auto`, `role="dialog" aria-modal aria-labelledby`, foco atrapado, cierre con Esc y devolución del foco al cerrar.
- **Garantía que afecta:** usabilidad móvil y accesibilidad.

### C7 — MEDIO — Voseo inconsistente (usted / tú / vos)
- **Evidencia:**
  - usted: `pages/plataforma/TiendaRapidaPanel.tsx:117` («Usted carga los productos»), `PlataformaShell.tsx:182`, `CuentaPlataforma.tsx:16`, `CrmPlataforma.tsx:118`, `NegociosPlataforma.tsx:43`
  - tú: `i18n/locales/es.json:3283` («Tienes un retiro en proceso. Espera…»), `pages/admin/AdminReporteContador.tsx:138` («Intenta de nuevo»), `pages/admin/suscripcion/SuscripcionAcciones.tsx:39` («Elige un plan y paga»), `components/admin/CategoriaSelect.tsx:71` («Selecciona categoría»), `pages/admin/productos/BloqueCategoriaBodega.tsx:26`
  - vos (lo correcto): el manifest «comprá y vendé».
- **Riesgo:** la voz de marca se ve inconsistente.
- **Corrección:** pasar todo a vos: «Tenés un retiro en proceso. Esperá…», «Intentá de nuevo», «Elegí un plan y pagá», «Seleccioná categoría», «Vos cargás los productos». Sumar una regla de lint o un test sobre `es.json` que busque `\b(tienes|puedes|intenta|elige|selecciona|usted)\b`.
- **Garantía que afecta:** confianza (marca).

### C8 — BAJO — Labels no asociados a sus inputs
- **Evidencia:** `components/inventario/CapturaProductoForm.tsx:73-74`: `<label className=...>Nombre</label>` seguido de `<input required value={nombre} ...>`, sin `htmlFor`/`id` ni anidamiento. Los inputs además usan `outline-none` (líneas 75, 81, 87) sin un reemplazo `focus-visible`.
- **Riesgo:** el lector de pantalla no lee el nombre del campo y con teclado no se ve dónde está el foco.
- **Corrección:** `useId()` + `htmlFor`, y `focus-visible:ring-2` donde haya `outline-none`. Hay 198 usos de `outline-none` sin `ring`/`focus-visible` en la misma línea; conviene revisarlos.
- **Garantía que afecta:** accesibilidad.

### C9 — BAJO — Botones de cerrar de 32 px (por debajo de 44 px táctiles)
- **Evidencia:** `components/admin/ClienteDetailModal.tsx:46`, `pages/admin/proveedores/ProveedoresTable.tsx:85`, `layouts/admin/SidebarContent.tsx:85`: `className="w-8 h-8 ..."`.
- **Riesgo:** en móvil es fácil tocar mal.
- **Corrección:** `size-11` (o `w-8 h-8` con un área táctil extendida `p-2 -m-2`).
- **Garantía que afecta:** usabilidad móvil.

### C10 — BAJO — Texto de 10 px en la compra
- **Evidencia:** `pages/checkout/MetodosPago.tsx:72` (`text-[10px]` en «más usado»). Hay 178 usos de `text-[9|10px]` en total.
- **Riesgo:** se lee mal en un celular de gama baja, y con contraste verde sobre verde claro probablemente no llega a 4.5:1 (no lo medí).
- **Corrección:** mínimo `text-xs` (12 px) en la interfaz del comprador y medir el contraste de los tokens `hc-success-text`/`hc-green-50`.
- **Garantía que afecta:** accesibilidad y usabilidad móvil.

---
## 2) MEJORAS

| # | Mejora | Impacto | Esfuerzo | Archivos | Cambio propuesto |
|---|---|---|---|---|---|
| M1 | Módulo único de dinero | Alto | Medio | `utils/format.ts`, unas 22 `fmt` locales, `cotizacionService.ts`, `planesPrecios.ts`, `suscripcionHelpers.ts` | `formatMoney(monto, moneda, {centavos?})` con ₡ y US$ consistentes. Regla ESLint `no-restricted-syntax` contra `new Intl.NumberFormat` fuera de `utils/format.ts` |
| M2 | Componente `<Modal>` accesible | Alto | Medio | 36 archivos con `fixed inset-0` | `role=dialog`, foco atrapado, Esc, `max-h-[90dvh] overflow-y-auto`, hoja inferior en `<sm` |
| M3 | Mapa de errores a texto i18n | Alto | Bajo | `TilopayCardForm.tsx`, `configUi.tsx`, `WebAuthnStep.tsx`, `AdminWebAuthnSetup.tsx`, `SocialLoginButtons.tsx` | `mensajeUsuario(err, fallbackKey)` según status o código. Nunca mostrar `err.message` crudo |
| M4 | Tablas que se vuelven tarjetas en móvil | Medio | Medio | `AdminGiftCards.tsx:163` (min-w 680), `SeccionItems.tsx:19` (700), `importar/FilaProducto.tsx:22` (990), `VentasTab.tsx:76`, `ProveedoresTable.tsx:14` | Hoy usan scroll horizontal (`overflow-x-auto`, 63 usos). Debajo de `sm`, mostrar cada fila como tarjeta, sobre todo la tabla de ítems de cotización, que se edita en el celular |
| M5 | Test de voseo | Medio | Bajo | `i18n/locales/es.json`, `i18n/fallbackEs.test.ts` | Test que falle si aparecen formas de tú o usted. Migrar las cadenas fijas de `pages/plataforma/*` a i18n |
| M6 | Imágenes con `loading="lazy"` y dimensiones | Medio | Bajo | 169 `<img>`, solo 31 con `loading="lazy"`; `components/ui/OptimizedImage.tsx` | Usar `OptimizedImage` (lazy, `width/height`, `decoding="async"`) en catálogo y listados para bajar el LCP/CLS en móvil |

Sin verificar (para el Dev o un auditor con navegador): el tamaño real del bundle (no compilé), el contraste medido y los re-renders en runtime.
