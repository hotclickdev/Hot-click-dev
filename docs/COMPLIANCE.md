# Informe de Cumplimiento Legal y SEO — HOTCLICK

**Fecha:** 5 de junio de 2025
**Dominio producción:** <https://hotclick.lat/>

---

## Páginas legales públicas

| Página | URL | Componente | Estado |
| --- | --- | --- | --- |
| Política de Privacidad | `/privacidad` | `PrivacidadPage.jsx` | ✅ |
| Términos y Condiciones | `/terminos` | `TerminosPage.jsx` | ✅ |
| Política de Devoluciones | `/devoluciones` | `DevolucionesPage.jsx` | ✅ |
| Política de Envíos | `/envios` | `EnviosPage.jsx` | ✅ |
| Política de Cookies | `/cookies` | `CookiesPage.jsx` | ✅ |
| Acuerdo de Vendedores | `/acuerdo-vendedores` | `AcuerdoVendedoresPage.jsx` | ✅ |
| Contacto | `/contacto` | `ContactoPage.jsx` | ✅ |
| Sobre Nosotros | `/nosotros` | `NosotrosPage.jsx` | ✅ |
| Preguntas Frecuentes | `/informacion` | `InformacionPage.jsx` | ✅ |

---

## Cumplimiento por plataforma

### Google OAuth Consent Screen

| Requisito | URL | Estado |
| --- | --- | --- |
| Página principal | `/` | ✅ |
| Política de Privacidad | `/privacidad` | ✅ |
| Términos de Servicio | `/terminos` | ✅ |

### Google Merchant Center

| Requisito | Estado |
| --- | --- |
| Política de devoluciones pública | ✅ `/devoluciones` |
| Política de envíos pública | ✅ `/envios` |
| Información de contacto visible | ✅ email + WhatsApp en footer |
| HTTPS configurado | ✅ TLS automático |
| Nombre de empresa visible | ✅ HOTCLICK en header/footer |
| Feed de productos | ⚠️ Pendiente setup manual |

### Stripe

| Requisito | Estado |
| --- | --- |
| Política de devoluciones/reembolsos | ✅ `/devoluciones` |
| Política de privacidad | ✅ `/privacidad` (menciona procesadores PCI-DSS) |
| Información de contacto | ✅ |
| Deslinde de responsabilidad financiera | ✅ Cláusula Quinta en `/terminos` |

---

## Ley N.° 8968 — Protección de Datos (Costa Rica)

### Documentación publicada

| Requisito | Documento | Estado |
| --- | --- | --- |
| Responsable del tratamiento identificado | `PrivacidadPage` § I | ✅ |
| Categorías de datos y finalidad | `PrivacidadPage` § II | ✅ |
| Transferencia a vendedores declarada | `PrivacidadPage` § III | ✅ |
| Derechos ARCO explicados | `PrivacidadPage` § IV | ✅ |
| Cookies con finalidad y base legal | `CookiesPage` + `PrivacidadPage` § V | ✅ |
| Retención de datos definida | `PrivacidadPage` § VI | ✅ |
| Medidas de seguridad descritas | `PrivacidadPage` § VII | ✅ |
| Protocolo de brechas de seguridad | `docs/legal/protocolo-incidentes.md` | ✅ |
| Acuerdo de Vendedores como Encargados | `AcuerdoVendedoresPage` (6 cláusulas) | ✅ |

### Consentimiento informado (mecanismo técnico)

| Flujo | Tipo | Implementación | Estado |
| --- | --- | --- | --- |
| Registro de usuario | `REGISTRO` | Checkbox desmarcado por defecto en `RegisterPage` | ✅ |
| Proceso de pago | `CHECKOUT` | Checkbox antes del botón "Pagar" en `CheckoutPage` | ✅ |
| Registro de negocio/vendedor | `VENDEDOR` | Checkbox con texto del Acuerdo en `RegistrarNegocioPage` | ✅ |

### Bitácora de consentimiento (backend)

| Elemento | Detalle | Estado |
| --- | --- | --- |
| Migración DB | `V56__consentimiento_log.sql` | ✅ |
| Tabla | `hot_click_consentimiento_log_tb` | ✅ |
| Campos | `usuario_id`, `tipo`, `ip_address`, `user_agent`, `fecha_consentimiento`, `version_doc` | ✅ |
| IP real capturada | `X-Forwarded-For` → fallback `remoteAddr` | ✅ |
| `usuario_id` nullable | Sí — invitados (guests) registran `NULL` | ✅ |
| Inmutabilidad | Sin setters, sin endpoints PUT/PATCH, `updatable = false` en fecha | ✅ |
| Endpoint | `POST /api/consentimiento` (público) | ✅ |

---

## SEO técnico

| Elemento | Estado |
| --- | --- |
| `<title>` descriptivo | ✅ |
| `<meta name="description">` | ✅ |
| `<meta name="keywords">` | ✅ |
| Open Graph completo (title, description, type, url, image, locale) | ✅ |
| Twitter Card `summary_large_image` | ✅ |
| Schema.org `Organization` | ✅ |
| Schema.org `WebSite` con `SearchAction` | ✅ |
| `<link rel="canonical">` | ✅ |
| `robots.txt` con sitemap URL | ✅ |
| `sitemap.xml` estático con todas las páginas públicas | ✅ |
| `og-image.png` (1200×630px) | ⚠️ Pendiente crear |
| Sitemap dinámico con productos individuales | ⚠️ Pendiente (requiere endpoint Spring Boot) |

---

## Footer — enlaces legales

Sección **Legal** en el footer incluye:

- Política de Privacidad → `/privacidad`
- Términos de Servicio → `/terminos`
- Política de Devoluciones → `/devoluciones`
- Política de Envíos → `/envios`
- Política de Cookies → `/cookies`
- Acuerdo Vendedores → `/acuerdo-vendedores`
- Preguntas Frecuentes → `/informacion`

---

## Documentos legales internos (`docs/legal/`)

| Archivo | Tipo | Descripción |
| --- | --- | --- |
| `terminos.md` | Contrato de adhesión | 10 cláusulas — naturaleza marketplace, pagos, deslinde PCI-DSS |
| `privacidad.md` | Política Ley 8968 | 7 secciones — ARCO, transferencia a vendedor, PRODHAB |
| `consentimiento.md` | Formulario consentimiento | Texto del checkbox + requisitos técnicos de implementación |
| `devoluciones.md` | Política comercial | CAPÍTULOS formales, Ley 7472 |
| `envios.md` | Política logística | 8 capítulos, 17 artículos, plazos por zona geográfica |
| `cookies.md` | Política cookies | 4 cláusulas + tabla de cookies por categoría |
| `acuerdo-vendedores.md` | Convenio accesorio | 6 cláusulas — Encargado de Tratamiento, prohibiciones absolutas, indemnidad PRODHAB |
| `protocolo-incidentes.md` | Gobernanza interna | Protocolo de notificación de brechas — debida diligencia ante PRODHAB |

---

## Estimación de preparación

| Plataforma / Norma | Nivel |
| --- | --- |
| Google OAuth Consent Screen | 95% — listo para enviar |
| Google Merchant Center | 70% — páginas listas, falta feed de productos |
| Stripe / PayXpert | 95% — deslinde financiero explícito |
| Ley 8968 CR — documentación | 100% |
| Ley 8968 CR — consentimiento técnico | 100% — bitácora activa con IP |
| SEO técnico | 90% — falta og-image.png |

---

## Pendientes (acción manual)

| Tarea | Prioridad |
| --- | --- |
| Crear `og-image.png` 1200×630px en `/public/` | Alta |
| Habilitar Google en Clerk Dashboard | Alta |
| Habilitar Microsoft en Clerk Dashboard (Azure App Registration) | Media |
| Crear cuenta Google Merchant Center + feed de productos | Media |
| Inscripción ante PRODHAB (trámite formal del abogado) | Alta |
| Sitemap dinámico con URLs de productos individuales | Baja |
| Registrar sitemap en Bing Webmaster Tools | Baja |
