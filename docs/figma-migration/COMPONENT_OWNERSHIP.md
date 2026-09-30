# Ownership de componentes y archivos compartidos

Actualizado 2026-09-30. Rutas relativas a `Hot_click_outlet/frontend/src/` salvo que se indique otra cosa.

**Regla:** un archivo compartido tiene un solo dueño. Quien lo necesita cambiar no lo edita: lo declara al dueño o al supervisor y espera. Dos agentes nunca editan el mismo archivo a la vez.

## Agentes

| Sigla | Alcance |
| --- | --- |
| SUP | Supervisor: rutas, merges, build, i18n al integrar, inventario |
| SHELL | Layout compartido: `MainLayout`, headers, barra inferior, footer, tokens |
| HOME | Home móvil y desktop |
| CAT | Buscar, filtros, categorías, Descubrí, foto, catálogo desktop, SearchPanel, `ProductCard` |
| PROD | Ficha de producto (móvil y desktop), variantes, personalizado, agotado, galería |
| STORE | Perfil del negocio, directorio de emprendimientos, tienda con su color |
| CHK | Carrito, checkout, pago, recuperar carrito, hojas, despacho del vendedor |
| ACC | Login, recuperar contraseña, cuenta, pedidos, favoritos, opiniones, seguridad, seguimiento |
| SRV | Servicios HOT, encargo, cotización, páginas informativas, blog |
| SYS | 404, fallo del servidor, instalar app, cookies, offline, popups, idioma, accesibilidad, WhatsApp |
| QR | QR de mesa y de pago, correos (backend) |

## Archivos compartidos

Formato: archivo → dueño → quién depende → condición.

| Archivo | Dueño | Dependen | Regla |
| --- | --- | --- | --- |
| `layouts/MainLayout.tsx` | **SHELL** | PROD, CHK, ACC, SRV, SYS, CAT, STORE, HOME | Solo SHELL. Los demás **consumen** la API nueva cuando SHELL esté integrado (ver abajo) |
| `components/comprador/header/*` (HeaderComprador, HeaderMovil, HeaderEscritorio, Compacto, Mínimo, BarraInterna, BarraMarca, MarcaComprador, `useHeaderComprador`, `tiposHeader`, `headerHelpers`) | **SHELL** | todos | Solo SHELL |
| `components/comprador/BarraInferior.tsx`, `barraInferiorHelpers.ts` | **SHELL** | todos | Solo SHELL |
| `components/comprador/FooterComprador.tsx` | **SHELL** | todos | Solo SHELL |
| `components/comprador/IconoFigma.tsx` | **SHELL** | todos | Solo SHELL |
| `components/comprador/iconosComprador.ts` | **SHELL** (registro base) | todos | Ver "Íconos" |
| `styles/hotclick-tokens.css`, `index.css`, `theme/*` | **SHELL** | todos | No cambiar valores sin avisar. Nueva utilidad: `.hc-input-libre` |
| `components/comprador/ProductCard.tsx`, `productCardHelpers.ts`, `useAgregarAlPedido.ts` | **CAT** | HOME, PROD, CHK, STORE | Congelado hasta que CAT haga el paso C0 (ver `PRODUCTCARD_STRATEGY.md`). Después, cambios solo vía CAT |
| `components/ui/ProductCard.tsx`, `ui/productCard/*`, `pages/catalogo/catalogoProductCard.ts` | **CAT** | `catalogo/*`, `descubri/DescubriResultados` | No borrar ni tocar hasta los pasos C1 a C5 |
| `components/comprador/Chip.tsx`, `CategoryTile.tsx`, `ConsultaRotativa.tsx` (+ helpers) | **HOME** | CAT, PROD, CHK | Congelados. Cambios vía HOME |
| `components/comprador/HojaInferior.tsx`, `AvisoVariosEmprendimientos.tsx` | **CHK** | PROD | |
| `components/comprador/estados/*` (EstadoVacio, ListaAccesos, falloServidor) | **SYS** | ACC, CHK, SRV | Los demás los consumen |
| `components/comprador/PaginaInformativa.tsx` | **SRV** | SYS | |
| `components/comprador/instalar/*` | **SYS** | | |
| `components/ui/searchPanel/*`, `ui/SearchPanel.tsx` | **CAT** | SHELL (lo monta) | |
| `components/ui/CookieBanner`, `PromoWelcomePopup`, `ExitIntentModal`, `AccessibilityPanel`, `LanguageSelector`, `WhatsAppFab`, `OfflineBanner` | **SYS** | SHELL (los monta en `MainLayout`) | SHELL no los modifica |
| `components/ai/*` (3 asistentes y tarjetas) | nadie | CAT, PROD, CHK | Duplicación conocida, refactor pausado por el usuario. Solo estilos si Figma lo pide, por el agente de la pantalla |
| `app/AppRoutes.tsx` | **SUP** | todos | **Ningún agente lo edita.** Declaran sus rutas (ver abajo) |
| `i18n/locales/{es,en,pt}.json` | agentes en su namespace; **SUP** integra | todos | Ver "i18n" |
| `Hot_click_outlet/src/main/resources/static/**` | **SUP** | | Artefacto de build. Nadie lo edita ni lo commitea salvo SUP |
| `package.json`, `pnpm-lock.yaml`, `vite.config.ts` | **SUP** | todos | Dependencias nuevas se piden a SUP |
| `store/*` (cart, auth, wishlist, ui…) | nadie | todos | Lógica de negocio: no se toca |

## Cómo consumir SHELL

```tsx
// Pantalla raíz (comportamiento actual, sin cambios): header global + barra inferior + footer
<MainLayout>...</MainLayout>

// Pantalla interna: barra con flecha atrás y título (Ficha, Carrito, Login, Servicios HOT, Descubrí)
<MainLayout variante="interna" titulo="Tu pedido (4)" atras="/productos" acciones={<span>3 de 10</span>}>...</MainLayout>

// Solo logo (404, pago exitoso)
<MainLayout variante="marca" marcaCentrada>...</MainLayout>

// Sin barra superior móvil: la pantalla dibuja la suya (Categorías)
<MainLayout variante="propia">...</MainLayout>

// Header desktop aparte (independiente de la variante móvil)
<MainLayout encabezadoEscritorio="completo" | "compacto" | "minimo">...</MainLayout>
```

| Prop | Valores | Por defecto |
| --- | --- | --- |
| `variante` | `raiz`, `interna`, `marca`, `propia` | `raiz` |
| `encabezadoEscritorio` | `completo` (Home, ficha), `compacto` (carrito, cuenta), `minimo` (checkout) | `completo` |
| `titulo`, `atras`, `acciones` | solo con `interna`. `atras`: ruta o función; sin valor usa el historial y cae en `/` | |
| `marcaCentrada` | solo con `marca` | `false` |
| `barraInferior` | boolean | sí, salvo en `interna` |
| `pie` | boolean. Fuera de `raiz` solo se ve en desktop | `true` |

Los 41 usos actuales de `<MainLayout>` no pasan props y conservan su comportamiento.

**Pendiente en SHELL, a pedido de quien lo necesite:** color rojo del carrito en el header compacto cuando la página es el carrito (`30:2268`), y avatar con foto si algún día existe.

## Rutas (`AppRoutes.tsx`)

Cada agente declara las rutas que necesita en `docs/figma-migration/ROUTES_REQUESTED.md` (una línea por ruta: agente, ruta, componente, guard). SUP las integra en un commit aparte, con su propia verificación. Hoy no hay rutas nuevas pendientes: la fase 2 ya trajo `/recuperar-contrasena` y `/seguimiento/:token`.

## Íconos

1. Buscar primero en `components/comprador/iconosComprador.ts` (ya hay 49) y en `assets/figma/`.
2. Revisar el nodo en Figma y descargar el SVG original (no redibujar).
3. Si no existe, el agente lo agrega en **su propio registro** (`pages/<area>/iconos<Area>.ts`) con el asset en `assets/figma/<area>/`, no en `iconosComprador.ts`. SUP consolida duplicados al integrar.
4. SHELL ya agregó `barraAtras` y `compraSeguraCandado`.

## i18n

- Cada agente agrega o cambia claves **solo dentro de los namespaces de su fila**. No reordena, no reformatea, no toca claves de otro namespace.
- Las tres lenguas (es, en, pt) van en el mismo commit: el gate E17 falla si falta una clave.
- Si necesita un namespace que no existe, lo **registra primero en esta tabla** (PR al supervisor) y recién crea claves.
- Los conflictos de JSON al integrar los resuelve SUP con la unión de claves, nunca descartando un lado.

Namespaces que existen hoy (58 de primer nivel) asignados por agente:

| Agente | Namespaces |
| --- | --- |
| SHELL | `nav`, `bnav`, `footer`, `common`, `comprador.header`, `comprador.nav`, `comprador.footer` |
| HOME | `home` (solo `home.compra.*` en el rediseño; el resto son claves del Home anterior), `comprador.consulta` |
| CAT | `products`, `search`, `descubri`, `quickView`, `chat`, `comprador.categoria`, `comprador.tarjeta` |
| PROD | `product` |
| STORE | nuevos por registrar: `tienda`, `emprendimientos` |
| CHK | `cart`, `checkout`, `checkoutStepper`, `payment`, `miniCart`, `shippingProgress`, `recuperarCarrito`, `comprador.aviso`, `comprador.hoja` |
| ACC | `login`, `register`, `forgot`, `profile`, `perfil`, `orders`, `wishlist`, `authPrompt`, `comprador.seguimiento` |
| SRV | `serviciosPage`, `ayudaPage`, `informacion`, `nosotros`, `contacto`; nuevo por registrar: `blog` |
| SYS | `notFound`, `estadosComprador`, `cookies`, `a11y`, `lang`, `theme`, `promo`, `exitIntent`, `socialProof`, `socialProofToast`, `comprador.falloServidor`, `comprador.instalarApp` |
| QR | `pos` |
| fuera de alcance | `admin*`, `adminOrders`, `adminConfig`, `adminFinanzas`, `adminAprobaciones`, `adminBilletera`, `adminClientes`, `adminOfertas`, `adminSolicitudes`, `emprende`, `pyme`, `negocioPlus`, `hero`, `importExport`, `multiImagePicker` |

## Orden de las olas

| Ola | Quién | Condición |
| --- | --- | --- |
| 0 | SHELL, SUP | Base integrada (hecho) y SHELL con QA independiente aprobado e integrado en `feat/figma/base` |
| 1 | HOME (merge de SHELL y re-medición) | SHELL integrado |
| 1 | CAT, PROD, STORE, CHK, ACC, SRV, SYS, QR | SHELL integrado. Ninguno empieza antes |

Dentro de la ola 1, CAT hace primero el paso C0 del `ProductCard` si otro agente necesita algo de ese componente.

## Conflictos activos

```
SHARED FILE: layouts/MainLayout.tsx
OWNER:       SHELL
DEPENDENTS:  PROD, CHK, ACC, SRV, SYS, CAT, STORE, HOME
STATUS:      SHELL implementado en feat/figma/shell; los dependientes esperan su integración

SHARED FILE: components/comprador/ProductCard.tsx
OWNER:       CAT
DEPENDENTS:  HOME, PROD, CHK, STORE
STATUS:      congelado hasta el paso C0

SHARED FILE: i18n/locales/*.json
OWNER:       cada agente en su namespace; SUP integra
DEPENDENTS:  todos
STATUS:      activo; riesgo alto de conflictos de merge
```
