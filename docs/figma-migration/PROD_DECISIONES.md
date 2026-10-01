# PROD · Las 4 decisiones que afectan comportamiento (informe de análisis)

Fecha: 2026-09-30. Base analizada: `feat/figma/base` e7717b64 (PROD integrado). Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`, página única `4:2` (90 pantallas). Es un análisis: no se modificó código, no hay commits.

## Cómo se obtuvo la evidencia

- **Texto de todos los nodos de Figma.** `get_metadata` de la página `4:2` completa (8.740 líneas, volcado y leído con búsqueda por texto de `Comprar`, `Garant`, `Compra segura`, `Envío`, `vendidos`, `personas`, `reseñ`, `Pago seguro`, `Cantidad`, `−`/`+`, `Agotado`, `Avisame`, `NUEVO`, `Nota`).
- **Capturas** de `28:839`, `44:1775`, `44:1917`; `get_design_context` de las galerías `28:840`, `44:1850`, `44:1918` y de la barra `44:2016`.
- **Cableado del prototipo y propiedades** vía `use_figma` en modo solo lectura (`reactions`, `description`, `annotations`, relleno del rectángulo `44:1919`). No se escribió nada en el archivo.
- **Código** en el worktree `base` (solo lectura) e historial (`git show 1c87c9d3:...`, `git log -S`).
- No hay comentarios ni anotaciones de diseño sobre la ficha: ningún nodo de `28:839`, `29:2072`, `44:*` tiene `description` ni `annotations`. Las notas del archivo (`23:846`, `29:1148`, `30:1816`, `51:2584`, `54:2302`) no mencionan la ficha, "Comprar ahora", cantidad ni confianza. Los comentarios de Figma (hilos de colaboración) no se pueden leer con las herramientas disponibles: ver "Qué no se pudo verificar".

## Tabla resumen

| # | Punto | Veredicto | Impacto en CHK |
| --- | --- | --- | --- |
| 1 | Quitar "Comprar ahora" | DECISION_RESPALDADA_POR_FIGMA (la eliminación). **Condición:** falta la hoja "Agregado a tu pedido" `45:1607`; hoy la ficha móvil no tiene camino al carrito | Alto. CHK debe construir la hoja `45:1607` y cablear Agregar a ella; el hook `handleComprarAhora` y su test e2e quedan obsoletos |
| 2 | Quitar confianza, prueba social y garantía de la ficha | DECISION_RESPALDADA_POR_FIGMA. Un matiz menor (resumen de calificación con datos) queda como REQUIERE_DECISION de bajo riesgo | Medio. La confianza que Figma sí dibuja vive en checkout ("Compra segura", "Pago protegido") y la ficha promete "compra sin crear cuenta" |
| 3 | Agotado: foto al 35 % vs rectángulo blanco opaco | REQUIERE_DECISION_DEL_USUARIO | Ninguno |
| 4 | Stepper en variantes y personalizado | Variantes: REQUIERE_DECISION (recomiendo mantener el stepper). Personalizado: DECISION_RESPALDADA_POR_FIGMA (sin stepper) | Bajo. El carrito de Figma tiene stepper por línea, así que la cantidad se corrige ahí |

---

## 1. "Comprar ahora"

**a) Qué muestra Figma.**
- La cadena `Comprar ahora` no existe en ningún nodo de las 90 pantallas. Tampoco `Comprar` como botón de la ficha.
- Ficha móvil `28:839`: barra fija `28:977` (390x83, y=761) con stepper `28:978` (81x45) y un único botón `28:982` "Agregar · ₡17.500" (267x46).
- Ficha desktop `29:2072`: fila `29:2150` con stepper `29:2151` (97x49), botón `29:2155` "Agregar al pedido" (339x49) y favorito `29:2161` (52x52).
- **Cableado del prototipo (evidencia decisiva):** `28:982` "Agregar al pedido" tiene `ON_CLICK -> NAVIGATE -> 45:1607`. La pantalla `45:1607` "Agregado a tu pedido · hoja" muestra: producto, "Casa Luna 506 · 1 unidad", aviso "el envío ya lo pagás en este paquete", total "Tu pedido · 2 productos ₡29.400" y dos botones. "Seguir comprando" (`45:1636`) es `BACK`; "Ver pedido" (`45:1638`) es `NAVIGATE -> 28:989` (Carrito). Es decir, el camino ficha -> carrito -> checkout está dibujado y conectado y no pasa por "Comprar ahora".
- El mapa del flujo `34:1355` lista en "04 · Comprar": Carrito, **Agregado a tu pedido**, Checkout 1 Datos, 2 Entrega, 3 Pago... (`47:3397`).

**b) Comportamiento actual y anterior.**
- Antes (`1c87c9d3`): `ProductBuyActions` ponía "Comprar ahora" (primario rojo) y "Agregar al pedido" (secundario); `StickyCartBar` repetía "Comprar ahora". `handleComprarAhora` (`useProductDetail.ts:192`): si es personalizado con cotización, envía el encargo; valida stock y referencia; hace `addItem` (si no se acababa de agregar) y `navigate('/checkout')`. No dispara analítica propia (solo `analytics.addToCart` dentro de `addItem`).
- Ahora: la ficha solo tiene Agregar (`AccionesCompra.tsx`) que llama `handleAdd` -> `agregarAlPedido({conAviso:true})`: `addItem`, toast "añadido" y el botón dice "Añadido" 1,4 s. `handleComprarAhora` sigue exportado en el hook sin consumidores. Se puede borrar sin riesgo: nada lo usa.
- Ruta de checkout: no existe checkout directo. `/checkout` lee el carrito de `cartStore` (`CheckoutPage` en `AppRoutes.tsx:172`). "Comprar ahora" era solo `addItem` + `navigate('/checkout')`. Por eso quitarlo no rompe ninguna ruta ni endpoint.
- Otras apariciones de "Comprar ahora": `pages/tienda/TiendaBuyActions.tsx` y `TiendaProductoPage.tsx` (ficha pública de tienda, ruta `/tienda/:slug/...`, `navigate('/tienda/${slug}/checkout')`), y `prototipo/*` (maquetas). La ficha de tienda no está en Figma como pantalla propia; la nota `51:2584` G dice "'Agregar' sigue en rojo HotClick" para la tienda con su color. Es territorio STORE y no se tocó.

**c) ¿Eliminación intencional?** Sí, con alta confianza: no solo "no dibuja" el botón, sino que dibuja y conecta el reemplazo (hoja `45:1607` con "Ver pedido"). Además todo el vocabulario de Figma es "pedido" (`Agregar al pedido`, `Tu pedido`, `Agregado a tu pedido`).

**d) ¿Existe en otro frame?** No. Ningún frame (carrito, checkout, tarjeta de producto, tienda, favoritos, perfil) tiene "Comprar ahora". La tarjeta de producto solo tiene el botón "+" rojo ("Agregar", `8:270`).

**e) Impacto sobre CHK.**
- **Hueco funcional actual (lo más importante):** la ficha usa `MainLayout variante="propia" barraInferior={false}`. En móvil no hay header ni barra inferior (en Figma tampoco: la barra de compra ocupa ese lugar). Tras tocar Agregar, el usuario móvil no tiene ningún enlace visible al carrito: solo el toast (sin acción), y el cajón `MiniCartDrawer` nunca se abre (no hay ningún `setCartDrawerOpen(true)` en `src`). En desktop sí queda el enlace del header. Antes, "Comprar ahora" cubría ese camino.
- `Toast` ya soporta una acción (`ToastAccion {label,onClick}`, `Toast.tsx:8`) pero la ficha no la usa.
- CHK (carrito, `45:1607`, checkout) debe: construir la hoja `45:1607`, abrirla desde Agregar de la ficha móvil, con "Ver pedido" -> `/carrito` y "Seguir comprando" -> volver; el texto sobre paquetes y envío ya pagado depende de la lógica de paquetes por tienda (frames `37:*`, `40:1377`).
- Tests: `tests/pdp-comprar-ahora.spec.ts` ya no sirve: busca el botón "Comprar ahora" y en su última prueba hace `readFileSync` de `ProductBuyActions.tsx` y `StickyCartBar.tsx` (borrados), así que fallaría con ENOENT. `tests/ui-sin-emoji.spec.ts:132` lee `TitleAndBadges.tsx` (borrado) y también fallaría. Ninguno está en `test:e2e:ci` (el CI solo corre `pos-pago-express`, `descubri-pago`, `seller-*`, `emprendedor-wizard`), por eso nadie lo notó; `pnpm test` (vitest) no los ejecuta.
- Que el checkout funcione sin cuenta se conserva: la primera prueba del e2e viejo verificaba "la ficha no pide cuenta antes del checkout" y Figma lo promete ("compra sin crear cuenta" en `28:890`/`29:2180`; checkout `28:1109`, `30:2406`). CHK debe mantener ese invitado.
- Analítica: no hay eventos propios del botón. Se pierde la capacidad de distinguir compra directa de agregado, que nunca se instrumentó. El embudo `CARRITO_AGREGADO` y `CHECKOUT_INICIADO` (en `ejecutarPagarCheckout.ts:178`) no cambian.

**f) Veredicto: DECISION_RESPALDADA_POR_FIGMA** para quitar "Comprar ahora" y dejar solo Agregar.
Implementación recomendada:
1. Mantener la ficha como está (solo Agregar).
2. CHK implementa `45:1607` y la abre desde `agregarAlPedido` en móvil (en desktop Figma no tiene frame de hoja; ver "Qué no se pudo verificar").
3. Hasta que CHK entregue la hoja, no integrar esta rama a producción sin un camino al carrito. Mitigación mínima y reversible, que se aparta del Figma: acción "Ver pedido" en el toast de agregado (la API ya existe). Es decisión del supervisor si se acepta ese desvío temporal.
4. Cuando exista la hoja: borrar `handleComprarAhora`, las claves `product.buyNow` (es/en/pt) y reescribir `pdp-comprar-ahora.spec.ts` como Agregar -> hoja -> Ver pedido -> `/checkout` como invitado; arreglar la línea 132 de `ui-sin-emoji.spec.ts`.

---

## 2. Distintivos de confianza, prueba social y garantía

**a) Qué muestra Figma.** La ficha completa móvil `28:839` (1522 de alto, no es un frame parcial) tiene, en orden: galería, vendedor, título, precio + "IVA incluido", "Disponible · 12 en stock", descripción, **"Entrega y pago"** (`28:875`: "Envío a todo Costa Rica / Desde ₡4.000 · 2 a 4 días hábiles en GAM" y "Pagá como prefieras / SINPE Móvil, tarjeta o efectivo · compra sin crear cuenta"), "Preguntale sobre este producto" (con el chip `¿Tiene garantía?`), "Opiniones" (solo estado vacío: "Todavía no tiene opiniones / Quienes lo compren podrán calificarlo desde su cuenta."), "También te puede gustar" y la barra de compra. El desktop `29:2072` es equivalente.
No hay en toda la página de Figma textos de estrellas, "N reseñas", "vendidos", "personas", "Garantía 40 días" ni insignias de confianza en la ficha. La única mención de reseñas es la nota técnica SEO `29:1153` ("AggregateRating solo con reseñas reales"), que apunta a JSON-LD y no a la interfaz.

**b) Comportamiento actual y anterior.** Antes (`ProductInfo` en `1c87c9d3`): `SocialProof` mostraba estrellas + promedio + "(N reseñas)" (dato real de `testimonioService.getRating`) y cuatro píldoras fijas ("Compra 100% segura", "Garantía 40 días", "Envío Correos CR", "Clientes satisfechos"); además `TrustBadges` (4 tarjetas: garantía, "Pago 100% seguro", "Soporte WhatsApp", "Envío a todo CR"). Ahora: `BloqueEntregaPago` + `PreguntaProducto` + `OpinionesProducto` (estado vacío o lista con autor, estrellas y comentario). El JSON-LD con `aggregateRating` (`utils/jsonLd.ts:113`) no cambió, así que el SEO no se afecta.

**c) ¿Intencional?** Sí con buena confianza: en `28:839` y `29:2072` hay espacio entre precio y descripción donde iban, y Figma reemplaza la confianza por un bloque específico (Entrega y pago). La confianza que Figma sí quiere está en otro lugar: header "Compra segura" en todo el checkout (`28:1095`, `29:1260`, `29:1356`, `30:2395`, `55:2230`...), "Visa o Mastercard · pago protegido" (`29:1399`), "Pago protegido · SINPE Móvil, tarjeta o efectivo" (`30:2384`, `30:2525`) y la sección "Confianza" del Home (`7:309`: "Envío a todo Costa Rica", "Comprá sin crear cuenta", "Devoluciones"). La garantía aparece como proceso postventa: acción "Garantía" por paquete entregado (`37:1413`, "Garantía y opinión se habilitan en cada paquete cuando se entrega" `37:1496`), solicitud de garantía `28:1531` y página "Servicios HOT".

**d) Otra variante.** Los frames de estado (`44:*`) tampoco las tienen. "Garantía" se menciona en la ficha solo como pregunta sugerida al asistente.

**e) Impacto sobre CHK.** CHK debe respetar lo que Figma sí dibuja: header "Compra segura" (ya existe `HeaderEscritorioMinimo`, `compraSegura` en i18n) y las leyendas de "pago protegido" en pago. No hay dependencia técnica de los componentes borrados. Dependencia de producto: la ficha promete "compra sin crear cuenta", así que el checkout de invitado debe seguir operativo.

**f) Veredicto: DECISION_RESPALDADA_POR_FIGMA.** Dos matices:
- La **garantía de 40 días**: se quitó de la ficha; el texto vigente sigue en `WarrantySection` y `GarantiaBar`. No hace falta repetirla; si negocio la quiere en la ficha, es decisión de producto contra Figma. Confirmar con legal que Figma dejando la garantía fuera de la ficha es aceptable (skill `legal-costa-rica`, Ley 7472): no afirma nada, así que no agrega riesgo.
- REQUIERE_DECISION menor: con reseñas reales, `OpinionesProducto` lista reseñas pero ya no muestra el promedio ni el conteo. Figma solo dibujó el estado vacío; el estado con datos no está diseñado. No lo inventamos. Recomiendo dejarlo y pedir diseño del estado con reseñas.
- Código muerto resultante: `components/ui/SocialProof.tsx` (sin consumidores), claves i18n `product.trust*`, `socialProof.*`, `product.quantity`, `product.outOf`, `product.maxAvailable`. Limpiar al integrar.

---

## 3. Producto agotado: foto atenuada al 35 %

**a) Qué muestra Figma.** `44:1917` (390x1133). Galería `44:1918` (390x360): una imagen de relleno (el sofá verde, 600x600) y **encima** el nodo `44:1919` "Rectangle", 390x360, relleno sólido blanco **ligado a la variable `n/0`** (`VariableID:5:10`), opacidad de capa 1 y de relleno 1, visible. Resultado visible en la captura: bloque blanco liso; sobre él van atrás/compartir/favorito y el contador "1 / 4" (en `IBM Plex Mono`, sin puntos indicadores, a diferencia de la ficha normal `28:840`). En `44:1850` (personalizado) y `44:1776` (variantes) no existe ese rectángulo.

**b) Comportamiento.** Antes (`c7493b37`, ficha agotada previa): foto normal con aviso. Ahora: `ProductGallery` aplica `opacity-35` al botón de la foto cuando `atenuada` (`ProductGallery.tsx:118`), la foto sigue siendo clicable para abrir la galería completa.

**c) ¿Intencional?** No se puede determinar. A favor de "intencional": el rectángulo está ligado a un token y es un solo frame con ese rectángulo, no un accidente de exportación. En contra: debajo hay una foto real colocada a propósito; la capa blanca opaca puede ser un marcador de "deshabilitado" al que le falta transparencia, y ocultar por completo la foto del producto que el usuario quiere recuperar no es un patrón habitual. No hay notas de diseño que lo expliquen.

**d) Otra variante.** No. Ningún otro frame (ni la tarjeta de producto en carrusel "Parecidos disponibles", ni favoritos) muestra productos agotados atenuados u ocultos.

**e) Impacto sobre CHK.** Ninguno (la foto no interviene en carrito/checkout). `useAgregarAlPedido` ya ignora los agotados (`stock === 0`).

**f) Veredicto: REQUIERE_DECISION_DEL_USUARIO.** Opciones:
1. Literal (cubrir con `bg-hc-n-0` al 100 %): coincide con el frame; costo: la galería sigue navegable (contador, abrir en pantalla completa) pero no se ve nada; el usuario pierde el reconocimiento visual del producto. Riesgo: el diseñador quizá quería otra cosa. Aplica la regla "el mockup gana".
2. Mantener 35 % (actual): conserva reconocimiento y comunica "no disponible"; es una desviación explícita del frame.
3. Preguntar al diseñador qué opacidad quiso. Es la única opción que resuelve la duda de intención.
Recomendación: opción 3 y, si no hay respuesta, la opción 1 por la regla "el mockup gana", dejando el valor en una sola clase para cambiarlo fácil. No cambiar nada hasta decidir.

---

## 4. Stepper de cantidad

**a) Qué muestra Figma.**
- Ficha normal móvil `28:839` y desktop `29:2072`: **sí hay stepper** (`28:978` 81x45; `29:2151` 97x49).
- Variantes `44:1775`, barra `44:1844`: un solo botón de ancho completo (358x46) "Agregar talla 40 · ₡6.200". Sin stepper.
- Personalizado `44:1849`, barra `44:1912`: un solo botón (358x46) "Agregar pedido personalizado · ₡11.000" (texto de 278 px de ancho). Sin stepper.
- Agotado `44:1917`, barra `44:2016`: botón gris "+ Agotado". Sin stepper.
- Carrito `28:989`: cada producto tiene su stepper de línea (`37:1534`, 72x25, "−  1  +"), también en carrito con paquetes y checkout.

**b) Comportamiento.** Antes: `QuantitySelector` en la ficha + `StickyCartBar` con stepper para productos con stock y no cotizables (incluía personalizados con precio fijo). Ahora (`AccionesCompra.tsx`): stepper en barra móvil y fila desktop salvo para personalizados (`!product.esPersonalizado`), donde se oculta. El carrito (`CartItemRow`) tiene su stepper, incluso para líneas personalizadas (cada una con `cartLineId` propio, no se fusionan en `cartStore.addItem`).

**c) ¿Intencional?** Las pantallas de estado `44:*` son frames **parciales** que dibujan solo lo que cambia. Prueba: la ficha de variantes `44:1775` (772 de alto) omite también "Disponible · N en stock", "IVA incluido", descripción, "Entrega y pago", "Preguntale" y "Opiniones", que sí existen en `28:839` y que el propio PROD **conservó** en variantes (`BloqueEntregaPago` y `PreguntaProducto` salen salvo en agotado). Con ese mismo criterio, omitir el stepper en variantes es "no dibujado". Para la barra de variantes cabe de sobra (81 + 10 + 267 = 358 y el texto de 180 cabe en el botón). En personalizado el texto de 278 px no cabe junto al stepper, lo que apunta a que allí sí puede ser deliberado, y además el pedido personalizado se arma con referencias y notas, no por unidades.

**d) Otra variante.** Sí: `28:839` y `29:2072` lo tienen y el carrito también.

**e) Impacto sobre CHK.** Bajo. La cantidad se puede corregir en el carrito en cualquier caso. Con "Agregar" ahora en la barra, el precio del botón mostrará el total (precio x cantidad) según `AccionesCompra`; en Figma el botón muestra el precio unitario con cantidad 1; coinciden. El carrito no depende de cómo se eligió la cantidad.

**f) Veredicto.**
- **Personalizado: DECISION_RESPALDADA_POR_FIGMA** (sin stepper). Implementación actual correcta.
- **Variantes: REQUIERE_DECISION_DEL_USUARIO.** Opciones: (A) mantener el stepper (actual, coherente con cómo PROD trató el resto de elementos faltantes de los frames de estado, sin perder función, cabe en el ancho); (B) quitarlo literalmente (el frame lo omite; el usuario cambia la cantidad en el carrito, un paso más). Recomiendo A, porque Figma no dibuja la eliminación de forma explícita y el resto de la ficha demuestra que los frames `44:*` son parciales. Si el usuario prefiere "el mockup gana a rajatabla", elegir B.

---

## Diferencias reales detectadas en CAT/PROD

1. **Ficha móvil sin camino al carrito (PROD, funcional).** `45:1607` no está implementado y la ficha no tiene header ni barra inferior en móvil. Evidencia: `ProductDetailPage.tsx` (`variante: 'propia', barraInferior: false`), `useProductDetail.ts:255-276` (solo toast), ausencia de `setCartDrawerOpen(true)`. Corrección propuesta: implementar la hoja `45:1607` (CHK) o, como puente, usar la acción del toast "Ver pedido" -> `/carrito`.
2. **Tests e2e rotos por borrados de PROD.** `tests/pdp-comprar-ahora.spec.ts` y `tests/ui-sin-emoji.spec.ts:132` leen archivos borrados o buscan un botón inexistente. Corrección: reescribir el primero (ver punto 1) y eliminar la línea de `TitleAndBadges` del segundo. PROD.md solo menciona la edición de `codigoDescuento.test.ts`.
3. **Notificación de "prueba social" falsa y global (fuera de PROD, a SYS).** `AppChrome.tsx` monta `SocialProofToast` con `useSocialProof`, que elige al azar un comprador inventado (María de San José, Carlos de Alajuela...) y una acción (compró, agregó, vio) sobre productos reales cada 15-30 s; el comentario del propio hook dice "UI demo". No existe en ningún frame de Figma, y se muestra también en la ficha que PROD limpió. Es contenido fabricado que afirma compras que no ocurrieron, con riesgo contra la Ley 7472. Corrección propuesta: desmontar `SocialProofToast` hasta que haya datos reales o diseño. Es decisión del usuario/supervisor; se reporta por coherencia con el punto 2.
4. **Código muerto de PROD.** `handleComprarAhora` y `showSticky`/observer en `useProductDetail.ts` (`ProductDetailPage` ya no usa `showSticky`), `SocialProof.tsx`, claves i18n `product.buyNow`, `trust*`, `quantity`, `outOf`, `maxAvailable`, `socialProof.*`. Corregir en la limpieza de CHK.
5. **Posible pérdida de "Quedan N" en productos con color pero sin talla (PROD, no verificado en navegador).** `ProductoCabecera` oculta la línea de stock en modo `compacta` (que se activa también con `colorVariante`), y `SizeSelector` muestra el aviso de stock bajo solo con talla. Un producto con variantes de color sin talla y pocas unidades no mostraría escasez. Figma solo dibuja el aviso dentro de Talla (`44:1840`); no es una diferencia con Figma, es una inferencia de PROD a revisar. Corrección: mostrar la línea de stock bajo en `compacta` cuando no hay talla.
6. **CAT:** no se detectó ninguna diferencia nueva con Figma en lo revisado (tarjeta "+" `8:270` coincide con `useAgregarAlPedido`). No se hizo una revisión de píxeles de CAT en este análisis.

## Qué no se pudo verificar

- **Comentarios de Figma** (hilos de colaboración) sobre las fichas: las herramientas MCP no los exponen; el diseñador pudo haber explicado ahí el rectángulo blanco o el stepper. Es lo primero que conviene preguntar al diseñador.
- **Comportamiento esperado de Agregar en desktop:** `45:1607` es un frame móvil de 390; no hay hoja ni cajón desktop en Figma, por lo que no se puede afirmar qué debe pasar tras Agregar en desktop (el header ya tiene el enlace al carrito).
- **Estado con reseñas reales:** Figma solo dibuja el estado vacío de Opiniones.
- **Intención del diseñador** sobre el rectángulo blanco `44:1919`: solo hay evidencia circunstancial (ver punto 3).
- No se ejecutaron la app ni los tests e2e; las afirmaciones sobre tests rotos vienen de leer el código (un `readFileSync` de un archivo borrado falla siempre).
- Si `SocialProofToast` se ve efectivamente en producción dependiendo de rutas excluidas (`EXCLUDED_PREFIXES`, roles admin) no se probó en navegador.
