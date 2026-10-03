# Eliminado del visitante: Fase 2, alineación total con Figma

Rama `feat/figma/alineacion-total`, archivo Figma `TmxYFj2nauu10WZnZ0t6yt`, página `4:2`. Al 2-oct-2026.

Acá está todo lo que se quitó de la experiencia del **visitante/comprador** porque era diseño viejo o no aparece en Figma. Emprendedor, admin, Pyme y Negocio Plus no se tocaron. Las rutas son relativas a `Hot_click_outlet/frontend/src/` salvo que se indique otra cosa.

En la columna "¿Podría hacer falta?":
- **No**: no se pierde ninguna función.
- **Quizás**: es una función real que Figma no dibuja. Se puede volver a agregar en estilo Figma.
- **Hace falta agregar**: Figma lo pide y el sistema todavía no lo tiene.

## Componentes y archivos eliminados

| Qué era | Dónde | Qué hacía | Commit | ¿Podría hacer falta? |
|---|---|---|---|---|
| `ConvenioCard` | `pages/emprendimientos/ConvenioCard.tsx` | Tarjeta de "convenio" en el directorio de emprendimientos, con el estilo viejo | `07da5781` | No. El directorio de Figma `29:1159` no la tiene |
| `BrandProductsRow` | `pages/producto/BrandProductsRow.tsx` | Fila "Más de esta marca" en la ficha | `b9b22017` | **Restaurado** en estilo Figma como `pages/producto/MasDeLaMarca.tsx` (marca o, si no hay, la tienda; sin el producto actual; se oculta si está vacía) |
| `ProductVideo` (viejo) | `pages/producto/ProductVideo.tsx` | Caja negra del video dentro de la ficha | `b9b22017` | No. Se reemplazó por la sección "Video del producto" de la imagen aprobada (`3534eee6`) |
| `ProductVideoVisor` + `BotonVideoProducto` | `pages/producto/ProductVideoVisor.tsx` | Visor modal y botón "Ver video" sobre la galería | `53497183` | No. El video se reproduce en su sección |
| `LegalMasLinks` | `pages/legal/LegalMasLinks.tsx` | Bloque de enlaces "más información" en las páginas legales. Ya no lo importaba nadie | `4e457c19` ⚠️ | No. **Aviso:** el borrado quedó dentro del commit del manual de marca |
| Layouts legales viejos, hero y motion de Nosotros | `pages/legal/*`, `pages/NosotrosPage.tsx` | Encabezados con gradiente y animaciones de entrada | `41c683ca` | No. Se reemplazaron por la plantilla `28:1660` |
| 9 secciones de Información | `pages/informacion/ConditionsSection.tsx`, `FaqSection.tsx`, `HowToBuySection.tsx`, `InformacionCta.tsx`, `InformacionHero.tsx`, `ReservePolicy.tsx`, `ShippingOptions.tsx`, `WarrantySection.tsx`, `informacionIcons.tsx` | Mosaicos, hero y CTA de la página Información | `7ec1b929` | No. El contenido sigue en la plantilla `28:1660` |
| Mosaicos de Contacto y animación `fadeUp` | `pages/ContactoPage.tsx` y utilidades de motion | Tarjetas con animación de entrada | `7ec1b929` | No |
| 4 bloques de Devoluciones | `pages/devoluciones/DevolucionesBadges.tsx`, `DevolucionesCta.tsx`, `DevolucionesHero.tsx`, `DevolucionesSections.tsx` | Hero, sellos y secciones con el estilo viejo | `47193769` | No. El texto sigue en `devolucionesData.tsx` |
| CTA de WhatsApp en Devoluciones | `pages/devoluciones/DevolucionesCta.tsx` | Botón grande "Escribinos por WhatsApp" | `47193769` | Quizás. El número sigue en el texto y en Contacto |
| `RegisterHeader`, `EmprendimientoCloud` | `pages/auth/RegisterHeader.tsx`, `pages/auth/EmprendimientoCloud.tsx` | Encabezado con título en gradiente y "nube" de emprendimientos en Crear cuenta | `d2d6b4ad` | No |
| Pestañas comprador/vendedor de Crear cuenta | `pages/auth/*` | Cambiaban el registro a vendedor | `d2d6b4ad` | No. El enlace "Quiero vender" sigue igual (ítem aprobado 4) |
| Barra inferior de la tienda | `pages/tienda/TiendaBottomNav.tsx`, `tiendaBottomNavItems.ts`, CSS `.hc-tienda-bottom-nav` | Navegación Tienda / Catálogo / Pedido | `d45416ff` | No. Figma `29:922` usa encabezado y barra "Ver pedido" |
| `TiendaWhatsAppFab` | `pages/tienda/TiendaWhatsAppFab.tsx` | Botón flotante de WhatsApp del vendedor | `d45416ff` | Quizás. El WhatsApp del vendedor sigue en el perfil y en la ficha |
| `TiendaAnfitrion` | `pages/tienda/TiendaAnfitrion.tsx` | Banda "Tienda alojada en HotClick" | `d45416ff` | No. Se reemplazó por "en HotClick" en el encabezado |
| Banda azul oscuro del encabezado de la tienda | `pages/tienda/TiendaHeader.tsx` | Encabezado oscuro con el nombre de la tienda | `d45416ff` | No |
| `CLASE_INPUT_TIENDA`, `CLASE_TARJETA_TIENDA` | `pages/tienda/tiendaTheme.ts` | Clases viejas de campos y tarjetas | `d45416ff` | No. Se reemplazaron por `PiezasTienda` |
| Botón flotante de WhatsApp de HotClick fuera del Home | `components/ui/flotantes/flotantesHelpers.ts` (regla) | Se mostraba en todas las pantallas del visitante | `4433d27c` | No. Figma `51:2262` lo dibuja solo en el Home. Las rutas de roles no cambian |
| `AIPostPaySection` | `components/ai/AIPostPaySection.tsx` | Chat "Soporte de pago" dentro del pago fallido | `4433d27c` | Quizás. Sigue el botón de soporte |
| `ReturnVisitorBanner` (viejo) | `components/ReturnVisitorBanner.tsx` | Banner animado de bienvenida de vuelta | `4433d27c` | No. Se rehízo como aviso azul derivado de `29:2036` |
| `MiniCartDrawer` y sus partes | `components/ui/MiniCartDrawer.tsx`, `miniCart/MiniCartEmpty.tsx`, `MiniCartItems.tsx`, `MiniCartFooter.tsx` | Cajón lateral del carrito. Nada lo abría | `1b22e2a2` | No. El carrito es la página `28:989` y la hoja `45:1607` |
| `ShippingProgress` | `components/ui/ShippingProgress.tsx` | Barra "te faltan ₡X para envío gratis" del cajón | `1b22e2a2` | Quizás. Figma no la dibuja |
| `CheckoutStepper` | `components/ui/CheckoutStepper.tsx` | Pasos viejos del checkout | `1b22e2a2` | No. Lo reemplaza `IndicadorPasos` |
| `IconoAsistente` | `components/ai/IconoAsistente.tsx` | Ícono viejo del asistente | `1b22e2a2` | No. Se usa el ícono exportado de Figma |
| `Modal` viejo del CartModal | `components/CartModal.tsx` | Diálogo centrado de "agregado al carrito" | `1b22e2a2` | No. Ahora es `HojaInferior`, derivado de `29:2036` / `45:1607` |
| Colores ámbar, `framer-motion` del acordeón de reseñas | `pages/servicios/TestimonioCard.tsx`, `StarPicker.tsx` | Estrellas `#fbbf24` y tarjeta con animación | `b0f59b41` | No |
| Paleta vieja en Descubrí | `pages/descubri/DescubriError.tsx`, `DescubriLoading.tsx`, `DescubriRevelacion.tsx`, `DescubriResultados.tsx` | Estados con `--hc-accent` / `--hc-surface` y cuadrado animado | `b172cf4c` | No |
| Página `/error` oscura para el visitante | `Hot_click_outlet/src/main/java/com/hotclick/controller/CustomErrorController.java` | HTML negro con emoji 🔍 y botón violeta | `eb0535e3` | No. El visitante ve el estilo de `45:2198` y `45:2322`; paneles y roles siguen con la oscura |
| `PageLoader` para el visitante | `components/ui/Spinner.tsx` (`PageLoaderFigma`) | Bolsa con barra y puntos al cargar una ruta | `64d83798` | No. Para paneles y landings sigue el de siempre |
| `Modal` centrado con velo borroso para el visitante | `components/ui/Modal.tsx` (`ModalFigma`) | Tarjeta `hc-modal-bg` centrada, título con borde inferior y cierre con anillo | `aa4b681c` | No. En rutas del visitante es la hoja inferior `45:1612`; los paneles siguen igual |
| Botones `#ef4444` / `--hc-surface-2` del `ConfirmModal` para el visitante | `components/ui/ConfirmModal.tsx` | Confirmar rojo pill a la izquierda y cancelar gris | `21f6d326` | No. Visitante: botones de hoja `51:2192`/`51:2194` (cancelar a la izquierda, rojo a la derecha) |
| Toast oscuro n900 para el visitante | `components/ui/Toast.tsx` (`PilaToastsFigma`) | Pila de toasts negros abajo a la izquierda | `03828a95` | No. Visitante: tarjeta blanca centrada (derivada de `29:2036`); paneles siguen con la oscura |
| Clases `hc-input*` para el visitante | `components/ui/Input.tsx` | Campo con fondo y foco de la paleta vieja | `3f4d7d83` | No. Visitante: campo `28:1110` |
| Clases `hc-btn*` para el visitante | `components/ui/Button.tsx` | Botones del Brand Book anterior (ghost con borde, success verde claro) | `25dbbe4e` | No. Visitante: primario rojo de 48, secundario borde n200, ghost texto b600 |
| Barra roja con brillo para el visitante | `components/ui/PageProgressBar.tsx` | Línea `--hc-primary` con `box-shadow` al navegar | `65a5d3e9` | No. Visitante: línea azul b600 sin brillo (Figma no tiene barra) |
| Botones "Tomar foto" y "Galería" en escritorio | `pages/buscar/BusquedaFotoPage.tsx` | En escritorio el navegador ignora `capture`, así que ambos abrían el mismo selector de archivos | este commit | No. En escritorio quedan "Elegir una foto" (principal) y "Explorar el catálogo" (secundario), y la zona acepta arrastrar. En móvil siguen los dos, como en Figma `27:882` |
| Aside marino de `/registro-empresa` (grilla, 2 `radial-gradient`, fade rojo, claim "Emprendé. Crecé. Brillá.", 4 perks y stats "0 ₡ / SINPE / CR") | `pages/registro-empresa/RegistroEmpresaAside.tsx`, `registroEmpresaIcons.tsx`, `PERKS`/`STATS` | Columna izquierda decorativa del alta | rediseño 3-oct (alta de vendedor) | No. Paleta previa a Figma; las ventajas quedan como 4 tarjetas claras en el paso 1 |
| Badge pulsante "Registro de emprendimiento", tarjeta con línea degradada y sombra roja del CTA, barra de 2 pasos con círculos | `pages/RegistroEmpresaPage.tsx`, `StepDatosEmpresa.tsx`, `StepDatosAdmin.tsx` | Alta en 2 sub-pasos | rediseño 3-oct (alta de vendedor) | No. Reemplazado por Plan → Tu negocio → Activar (propuesta de Diseño aprobada, pasos 28:1096) |
| Banner de cupos gratis en el alta (`EmprendeCupoBanner compact`) | `pages/RegistroEmpresaPage.tsx` | "Quedan N de 70 cupos gratis" | rediseño 3-oct (alta de vendedor) | Solo si HOT_CLICK define una promoción (decisión 13:55 CR: no se promete) |
| Línea degradada de `/registro-empresa/activar-plan` y "Continuar y pagar después" en texto gris | `pages/registro-empresa/ActivarPlanPage.tsx` | Paso de pago sin contexto de plan ni de paso | rediseño 3-oct (alta de vendedor) | No. Ahora es "Paso 3 de 3" con resumen del plan y "Pagar después" explicado |

## Hace falta agregar (Figma lo pide y el sistema no lo tiene)

| Qué | Dónde se nota | Detalle |
|---|---|---|
| Duración del video | Ficha, sección "Video del producto" (imagen aprobada `ficha-video.png`) | La API no manda la duración. Se muestra sin ella |
| Límite de `video_url` | Backend | La columna admite 500 caracteres y el DTO 1000. Hay que alinearlos |
| Formulario de video del vendedor | Panel emprendedor (fuera de alcance) | Solo está documentado en la auditoría §4.1 |
| "Continuar con Google" | Ingresar `28:1143` | Necesita Clerk activo (`VITE_CLERK_*`). Sin Clerk el botón no aparece |
