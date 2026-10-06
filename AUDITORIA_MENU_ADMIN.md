# Auditoría del menú Admin

Fecha: 5 de octubre de 2026.  
Base: `master` en `40151d405`.  
Rama de trabajo: `menu-admin-nuevo`.

Git rechaza espacios en el nombre de una rama (`menu-admin nuevo` no es un ref válido). El trabajo de esta fase quedó en `menu-admin-nuevo`, creada desde `master`. No se modificó el menú, las rutas ni el backend. Este archivo es el único entregable.

Auditorías de módulo ya existentes (no las reemplaza este documento): `Hot_click_outlet/docs/audit/modulos/admin-plataforma.md`.

El código no registra visitas a pantallas de Admin. Desde el repositorio se puede decir qué está implementado y qué está roto. No se puede decir cuántas veces se usa cada ventana en producción.

---

## 1. Resumen ejecutivo

`/admin` no es un solo producto. Según el rol, el mismo prefijo abre la consola de plataforma o el sistema del vendedor.

- **Plataforma:** rol `ADMIN`. Menú en `buildAdminItLinks` (`Hot_click_outlet/frontend/src/layouts/admin/adminItJobs.ts`): Inicio, Tiendas, Usuarios, Moderación, Configuración, Más herramientas, y tres bloques colapsados (Operar plataforma, Marketplace, Sistema). Unas 31 entradas.
- **Vendedor:** rol `EMPRENDEDOR` (el plan PYME o Negocio Plus no es un rol). Menú Sistema: pedidos, productos, clientes, copilot, POS. `AdminRoleSwitch` saca al `ADMIN` de esas rutas de tienda.

El problema del Admin de plataforma no es que falten pantallas. Es que el menú mezcla cuatro trabajos distintos (moderar, cobrar, operar servicios de HotClick, configurar el marketplace) y además muestra entradas que el propio guard redirige a Inicio. El inicio muestra conteos (tiendas, vendedores, productos, ventas) y no muestra la cola de trabajo que el backend ya calcula.

La mayoría de las pantallas de plataforma llaman API real. No es un menú de mockups. Las excepciones claras son la política de moderación y los métodos de pago de Configuración: listas fijas en el frontend.

Roles vivos en el JWT de plataforma: solo `ADMIN`. `SUPPORT`, `FINANCE` y `TRUST` se inactivaron en `V135__limpiar_roles_muertos.sql` y se remapean a `ADMIN`. `ROLES_STAFF` en el frontend está vacío. Existen tres permisos `global.companies`, `global.approvals` y `global.metrics`, pero hoy el `ADMIN` ve todo el menú.

### Respuestas directas

1. **Qué tiene el menú:** un núcleo de 6 ítems siempre visibles y 25 ítems en bloques secundarios (dinero, logística HotClick, CMS, seguridad, IA, auditoría).
2. **Para qué sirve cada ventana:** inventario en las secciones 2 y 3.
3. **Qué funciona:** empresas, ficha de negocio, usuarios, aprobaciones, reportes de producto, pagos, retiros, billing SaaS, soporte, seguridad, auditoría, control de IA, observabilidad, homepage, categorías, marcas, cupones, servicios Hot, recolecciones y digitalización de inventario.
4. **Qué se usa de verdad:** no hay telemetría de navegación admin en el código. No se afirma uso.
5. **Qué aporta valor:** aprobar negocios y ofertas, resolver denuncias de producto, pagar retiros, conciliar SINPE, cobrar la suscripción, atender tickets, bloquear IPs y ver el consumo de IA.
6. **Qué está obsoleto:** tab de productos en aprobaciones (drenaje de solicitudes viejas; el gate actual es el negocio), política y métodos de pago estáticos, hub Más herramientas.
7. **Qué estorba:** enlaces que el ADMIN no puede abrir (`/admin/ads`, garantías, clientes), la misma función en el sidebar y en Más herramientas, y el inicio sin cola de trabajo.
8. **Qué reconstruir:** Inicio, la entrada de Moderación, la presentación de Seguridad y de IA, y Configuración de plataforma.
9. **Qué fusionar:** reportes de producto dentro de Moderación; embudo y KPIs de observabilidad dentro de Inicio; Más herramientas dentro del sidebar.
10. **Qué sacar del menú de plataforma:** ads, cola offline, cotizaciones, publicaciones, garantías y clientes (son del vendedor). Facturas y config fiscal quedan en investigar: hoy leen el `empresaId` del JWT, no todos los negocios.
11. **Qué falta:** casos de moderación (asignación, prioridad, historial), incidente de seguridad como objeto, auditoría de suspensión con origen, y cuotas de IA editables. No falta un módulo nuevo de analítica ni roles nuevos para operar mañana.
12. **Cómo organizarlo:** sección 8.
13. **Quién entra:** hoy solo `ADMIN`. El mapa futuro usa los tres `global.*` que ya existen. Usuarios, seguridad, IA, flags, auditoría e impersonar se quedan en `ADMIN`.
14. **Qué va primero:** menú sin duplicados ni enlaces rotos, Inicio accionable con APIs que ya existen, Moderación como una sola entrada, Negocios sin cambiar estados.
15. **Beneficio:** el operador ve qué requiere decisión hoy, deja de perderse en ops de tienda, y las acciones críticas siguen teniendo un solo lugar con rastro.

Esta fase no reconstruye el menú. La sección 11 es el orden para la siguiente instrucción.

---

## 2. Inventario actual

### Cómo se elige el menú

| Mecanismo | Archivo | Efecto |
| --- | --- | --- |
| `buildSidebarLinks` | `frontend/src/layouts/admin/adminSidebarLinks.ts` | `ADMIN` o staff → menú de plataforma. Vendedor → Sistema. Cajero → POS. Gerente/supervisor → POS + ventas. |
| `esStaffPlataforma` | `frontend/src/utils/sistemaUser.ts` | Solo `ADMIN`. `ROLES_STAFF` está vacío. |
| `filtrarLinksPorPermiso` | `adminItJobs.ts` | `ADMIN` ve todos los links. Un staff futuro solo vería ítems con su `global.*`, más Inicio. |
| `AdminRoleSwitch` | `frontend/src/app/AdminRoleSwitch.tsx` | Exige JWT y rol de admin o POS. Si el `ADMIN` entra a una ruta de tienda (`esRutaTenantOpsParaAdmin`), vuelve a `/admin`. |
| `ITOnlyGuard` | `frontend/src/app/routeGuards.tsx` | Bloquea al vendedor en rutas de plataforma. |
| `PermisoGuard` | mismo | `ADMIN` o el permiso del JWT. |
| `SuperAdminGuard` | mismo | Solo `userRole === 'ADMIN'`. |
| Bottom nav móvil | `frontend/src/prototipo/admin/AdminBottomNav.tsx` | Cuatro ítems: Inicio/Tiendas, Usuarios, Moderación, Configuración. |

`prototipo/admin/` no es otra aplicación. Son piezas de UI (header, filas, bottom nav) usadas por las rutas reales.

### Núcleo (siempre visible)

| Ventana | Ruta | Componente | Permiso del link | Guard de ruta | Estado |
| --- | --- | --- | --- | --- | --- |
| Inicio | `/admin` | `SuperAdminHome` vía `AdminHomeRoute` | ninguno | layout admin | Funcional, poco accionable |
| Tiendas | `/admin/empresas` | `AdminEmpresas` | `global.companies` | `PermisoGuard` | Funcional |
| Ficha | `/admin/empresas/:id` | `AdminEmpresaWorkspace` | no está en el sidebar | `global.companies` | Funcional |
| Usuarios | `/admin/usuarios` | `AdminUsers` | ninguno en el link | `SuperAdminGuard` | Funcional |
| Moderación | `/admin/aprobaciones` | `AdminAprobaciones` | `global.approvals` | `PermisoGuard` | Funcional, incompleta como mesa de casos |
| Configuración | `/admin/configuracion` | `SuperAdminConfig` si el rol es `ADMIN` | ninguno | layout admin | Hub real + dos pantallas estáticas |
| Más herramientas | `/admin/herramientas` | `AdminMasHerramientas` | ninguno | layout admin | Solo navegación; dos links rotos para ADMIN |

### Operar plataforma (colapsada por defecto: no; Marketplace y Sistema sí arrancan colapsados)

| Ventana | Ruta | Componente | Permiso del link | Guard | Estado |
| --- | --- | --- | --- | --- | --- |
| Retiros | `/admin/payouts` | `AdminPayouts` | `global.metrics` | `PermisoGuard` | Funcional |
| Billing | `/admin/saas-billing` | `AdminBillingPlataforma` | `global.metrics` | `PermisoGuard` | Funcional |
| Billing de un negocio | `/admin/saas-billing/:id` | `AdminBillingEmpresa` | no está en el sidebar | `global.metrics` | Funcional |
| Pagos y webhooks | `/admin/pagos` | `AdminPagos` | `global.metrics` | `PermisoGuard` | Funcional |
| Ads | `/admin/ads` | `AdminAdsMetricas` | `global.metrics` | el link existe, pero la ruta está en ops de tienda | El ADMIN es redirigido a Inicio |
| Por qué no compran | `/admin/embudo` | `AdminEmbudo` | `global.metrics` | `PermisoGuard` | Funcional, solo lectura |
| Recolección | `/admin/recolecciones` | `AdminRecolecciones` | `global.companies` | `PermisoGuard` | Funcional |
| Productos reportados | `/admin/reportes-producto` | `AdminReportesProducto` | `global.approvals` | `PermisoGuard` | Funcional |
| Inbox soporte | `/admin/soporte` | `AdminSoporteTickets` | `global.companies` en el link | `SuperAdminGuard` | Funcional; el permiso del link no abre la ruta |
| Servicios Hot | `/admin/servicios` | `AdminSolicitudesServicio` | `global.companies` | `PermisoGuard` | Funcional |
| Captura inventario | `/admin/inventario/captura` | `AdminInventarioCaptura` | ninguno | `SuperAdminGuard`; excepción de ops de tienda | Funcional |
| Paquetes inventario | `/admin/inventario/paquetes` | `AdminInventarioPaquetes` | ninguno | `SuperAdminGuard` | Funcional |
| Detalle de paquete | `/admin/inventario/paquetes/:id` | `AdminInventarioPaqueteDetalle` | no está en el sidebar | `SuperAdminGuard` | Funcional |
| Cola offline | `/admin/offline/cola` | `AdminOfflineCola` | ninguno | también está en el menú del vendedor | Funcional para el dispositivo; mal ubicada en plataforma |
| Comprobantes electrónicos | `/admin/facturas` | `AdminFacturas` | `global.metrics` | `PermisoGuard` | Parcial: perfil del JWT, no consola multi-negocio |
| Compras D-105 | `/admin/compras-d105` | `AdminComprasD105` | `global.metrics` | `PermisoGuard` | Funcional, scope a investigar |
| Config fiscal | `/admin/config-fiscal` | `AdminConfigFiscal` | `global.metrics` | `PermisoGuard` | Parcial: certificado del `empresaId` del JWT |

### Marketplace

| Ventana | Ruta | Componente | Guard | Estado |
| --- | --- | --- | --- | --- |
| Homepage | `/admin/homepage` | `AdminHomepage` | `SuperAdminGuard` | Funcional |
| Categorías | `/admin/categorias` | `AdminCategories` | fuera de `ITOnlyGuard` | Funcional; la URL no exige ser ADMIN |
| Marcas | `/admin/marcas` | `AdminMarcas` | el vendedor es redirigido a su config de marca | Funcional para ADMIN |
| Descuentos / cupones | `/admin/cupones` | `AdminCupones` | `SuperAdminGuard` | Funcional, lectura |

Ningún ítem de Marketplace lleva `permiso:` en el sidebar. Un staff futuro con solo `global.*` no los vería (`filtrarLinksPorPermiso` exige permiso salvo Inicio). El `ADMIN` sí los ve.

### Sistema de plataforma

| Ventana | Ruta | Componente | Guard | Estado |
| --- | --- | --- | --- | --- |
| Security Center | `/admin/security` | `AdminSecurityCenter` | `SuperAdminGuard` | Funcional |
| Auditorías | `/admin/auditorias` | `AdminAuditorias` | `SuperAdminGuard` | Funcional, solo lectura, cobertura incompleta |
| Feature flags | `/admin/superadmin` | `AdminSuperAdmin` | `SuperAdminGuard` | Funcional |
| Observabilidad | `/admin/observabilidad` | `AdminObservabilidad` | `SuperAdminGuard` | Funcional |
| Control de IA | `/admin/ai-control` | `AdminAiControl` | `SuperAdminGuard` | Funcional, cuotas no editables |
| Multipaís | `/admin/multipais` | `AdminMultipais` | `SuperAdminGuard` | Funcional |

### Enrutadas y fuera del sidebar, o rotas para el ADMIN

| Ruta | Qué es | Qué le pasa al ADMIN |
| --- | --- | --- |
| `/admin/cotizaciones` y alta/edición | Cotizaciones B2B del negocio | `SuperAdminGuard` y a la vez prefijo de ops de tienda: redirige a Inicio |
| `/admin/publicaciones` | Cola de publicaciones | Igual que cotizaciones |
| `/admin/garantias`, `/admin/clientes` | Links de Más herramientas | Ops de tienda: redirige a Inicio |
| `/admin/usuarios/:id` y `.../suspender` | Legacy | Redirect a `/admin/usuarios` |
| `/admin/tiendas`, `/admin/moderacion`, `/admin/config`, `/admin/dashboard` | Alias Figma | Redirect a la ruta real |
| `/admin/herramientas/*` | Alias | Redirect a marcas, garantías, clientes, auditorías, servicios o aprobaciones |

### Experiencia del vendedor que comparte `/admin` y no es este menú

Estas rutas son el sistema del negocio. El ADMIN no debe operarlas como si fueran su tienda. El menú nuevo no las absorbe.

Pedidos, encargos, productos, ofertas, clientes, finanzas, billetera del negocio, reportes, POS, bodegas, compras, proveedores, equipo, mi empresa, gift cards, blog, copilot, forecast, executive, planes y suscripción propia (`/admin/billing/planes`, `/admin/billing/suscripcion`), ayuda y garantías.

`/admin` para el vendedor renderiza `SistemaInicio`, no `SuperAdminHome`.

### APIs de plataforma sin entrada de menú

Existen y no forman parte del sidebar: indexar RAG (`POST /api/admin/rag/indexar`), agentes QA (`/api/admin/agentes/**`), reset de plataforma QA, reset de datos de un tenant, Telegram admin, plugins. Son herramientas de ingeniería o de riesgo. No se proponen como secciones del menú de negocio.

Jobs con ShedLock (retención, renovación de billing, auto-aprobación de payouts bajo ₡50.000, SINPE, carritos, facturación, Meta Ads, reconciliación de wallet) no tienen consola. La cola offline no los reemplaza: es IndexedDB del navegador.

---

## 3. Qué hace cada ventana

Leyenda de estado funcional: **A** funcional, **B** parcial, **C** UI sin lógica suficiente, **D** obsoleta o legacy, **E** duplicada, **F** mal ubicada, **G** importante e insuficiente. Una ventana puede llevar más de una letra.

### Inicio — `/admin` — A + G

Muestra cuatro KPIs calculados en el cliente (`kpisPanelAdmin`) a partir de `GET /api/admin/dashboard`, el listado de empresas y el listado de usuarios: tiendas activas, vendedores, productos publicados, ventas totales. Debajo, tres tiendas y botones a tiendas y moderación. No muta datos. No lee `GET /api/admin/moderacion/resumen` ni el dashboard de seguridad.

Decisión que permiten los cuatro números: casi ninguna. Un total de ventas no dice si hay un negocio por aprobar o un retiro pendiente.

### Tiendas y ficha — A

`AdminEmpresas` lista negocios (nombre, slug, plan, estado, visibilidad) y puede cambiar la visibilidad pública del catálogo. Alerta de empresas sin ubicación.

`AdminEmpresaWorkspace` es la herramienta de gestión: plan, estado (`ACTIVO`, `SUSPENDIDO`, `INACTIVO`), visibilidad, pestañas de productos, pedidos y equipo (invitar, cambiar rol, quitar). Impersonar: `POST /api/admin/empresas/{id}/impersonar`, JWT de 30 minutos con `rol=EMPRENDEDOR` y claims `impersonando` / `adminOriginal*`. Queda auditoría `IMPERSONACION_INICIO` y `IMPERSONACION_FIN`.

Estados reales de `estadoEmpresa`: `PENDIENTE_APROBACION` (alta), `ACTIVO`, `SUSPENDIDO`, `INACTIVO`, y `RECHAZADO` cuando se rechaza el alta. El cambio manual no puede volver a poner `PENDIENTE_APROBACION`. No existen En revisión, Restringido ni Bloqueado.

Suspender oculta el catálogo. No escribe una acción de auditoría dedicada. El frontend tiene etiquetas `SUSPENDER_EMPRESA` / `REACTIVAR_EMPRESA` que el backend no registra con esos códigos.

Riesgos ya descritos en `docs/audit/modulos/admin-plataforma.md` y que esta reconstrucción no debe ignorar: el JWT de impersonación no se revoca al salir (sigue hasta el TTL); finalizar no amarra el id del path al claim; el token ADMIN original queda en el cliente; un listado de webhooks de admin no filtra por empresa.

### Usuarios — A

`AdminUsers`: usuarios, pendientes, bloqueo, desbloqueo, borrado, restauración, cambio de rol y de estado, y una pestaña CRM. APIs de `adminService` (`/api/admin/usuarios` y acciones asociadas) más `crmService.listarClientes`. Solo `ADMIN`. La ficha `/admin/usuarios/:id` ya no existe: redirige al listado.

### Moderación — A + G

`AdminAprobaciones` tiene pestañas Empresas, Productos, Ofertas y Cuentas de cobro, y consume el resumen de moderación.

`GET /api/admin/moderacion/resumen` cuenta pendientes de: empresas (`PENDIENTE_APROBACION`), ofertas, recolecciones, SINPE, testimonios, payouts, reportes de producto y cuentas de cobro (`METODO_COBRO`). Garantías y Servicios Hot quedan fuera a propósito (son operación, no contenido).

Aprobar un negocio (`EmpresaAprobacionService.aprobarYPublicar`) lo pasa a `ACTIVO`, enciende visibilidad, publica productos activos y cierra solicitudes `PRODUCTO` viejas. Rechazar lo deja en `RECHAZADO`.

La pestaña Productos es drenaje legacy (`SolicitudProductoHandler`): no se crean solicitudes `PRODUCTO` nuevas. El gate de catálogo es el negocio.

No hay caso, asignado, prioridad, nota de mesa ni historial de revisiones. El comentario del revisor existe al aprobar o rechazar una solicitud. Un reporte de producto guarda `notasAdmin` y puede pausar el producto. A los 3 reportes pendientes el sistema pausa el catálogo solo.

### Configuración — A en el hub, C en dos hijas

`SuperAdminConfig` muestra la comisión leída de `billingService.getPlanes()` y cuatro links (`LINKS_CONFIG_ADMIN`): categorías, política, métodos de pago, notificaciones.

- Política (`?seccion=politica`): `REGLAS_MODERACION` en `prototipo/admin/adminData.ts` (foto real, precio mínimo, ofensas, tecnología). No se guarda.
- Métodos de pago (`?seccion=pagos-metodos`): lista estática `METODOS` del POS. No configura la pasarela.
- Notificaciones (`?seccion=alertas`): deriva avisos de las colas de aprobación. Parcial.

El mismo path `/admin/configuracion` para el vendedor abre perfil, marca y bodega. Son dos pantallas distintas según rol.

### Más herramientas — E

Lista de 12 links que en su mayoría ya están en Operar o en Sistema. Garantías y clientes no se pueden abrir siendo ADMIN.

### Dinero de plataforma — A, partidos en tres pantallas

No son la misma cosa y no deben fusionarse en una sola tabla:

- **Pagos** (`/admin/pagos`): KPIs, pagos, webhooks Stripe, comprobantes SINPE (confirmar o rechazar). Auditoría `APROBAR_SINPE`, `RECHAZAR_SINPE`, `AUTO_APROBAR_SINPE`.
- **Retiros** (`/admin/payouts`): solicitudes de billetera del vendedor. Estados `PENDIENTE`, `EN_PROCESO`, `PAGADO`, `RECHAZADO`. Aprobar o rechazar con nota. Un scheduler auto-aprueba montos de hasta ₡50.000.
- **Suscripciones** (`/admin/saas-billing`): negocios past-due, cobro Onvo/Stripe, detalle y ledger por negocio. El vendedor ve su propio plan en `/admin/billing/*`, que es otra ruta.

`/admin/finanzas` y `/admin/billetera` son del negocio (pedidos entregados, saldo propio). El ADMIN no llega: son ops de tienda.

### Embudo — A, lectura

`GET /api/admin/embudo`: visitas, carrito, checkout y pago en 7 o 30 días. Sirve para ver dónde se cae la compra. No dispara una acción dentro de la pantalla. Retención de sesiones: 90 días.

### Ads — F

Métricas de pauta del negocio (ROAS, gastos manuales). Está en el menú de plataforma y en el del vendedor. Para el ADMIN la ruta está en `PREFIJOS_TENANT_OPS`, así que el click vuelve a Inicio.

### Recolección, Servicios Hot, digitalización — A

- Recolección: solicitudes de retiro o entrega en la GAM. Asignar tarifa o rechazar.
- Servicios Hot: pedidos de foto o digitalización. Cambiar estado, nota, eliminar.
- Captura y paquetes: operación de campo (código de barras, foto, Excel, offline). El ADMIN elige el negocio destino. Es trabajo de HotClick, no el inventario del vendedor en `/admin/inventario` (ese está gateado por plan y redirige al copilot).

### Cola offline — A + F

Sincroniza ventas POS, pedidos, stock y capturas guardadas en el navegador. Útil en la caja del vendedor. En el menú de plataforma no hay una cola global de dispositivos.

### Facturas, D-105, config fiscal — B

Listan o cargan comprobantes y certificado usando el perfil de la empresa del JWT (`empresaService.getPerfil`, `empresaId`). Un ADMIN de plataforma sin esa empresa no está mirando “todas las facturas de HotClick”. Hay que confirmar en la fase siguiente si D-105 es la contabilidad de HotClick o la del tenant con el que entró el admin. Hasta entonces: investigar, no promoverlas a sección de finanzas globales.

### Homepage, categorías, marcas, cupones — A

CMS del marketplace público: secciones del home, árbol de categorías (CRUD e import), marcas con logo, cupones de bienvenida (estadísticas y listado). Categorías no está detrás de `ITOnlyGuard`: cualquiera con sesión que conozca la URL puede entrar si el backend no lo impide por su cuenta. Eso se anota como hueco de guarda en frontend; no se cambia en esta fase.

### Security Center — A + G

Ocho pestañas: Dashboard, Gestión, Seguridad (usuarios), IPs, Eventos, Alertas, Sentry, Sistema. API bajo `/api/security/**`, solo `ADMIN`.

El modelo distingue:

- **Evento:** `SecurityAuditLog` / `SecurityEventType` (login, bloqueo, reset de contraseña, 2FA, tokens, denegación, rate limit, fuerza bruta, IP abusiva, cambio de rol, acción admin). Guarda IP, user-agent y endpoint.
- **Alerta:** `SecurityAlert`, generada por detección, resoluble.
- **Incidente:** no existe en este centro. `IncidentRemediationService` es remediación de Sentry, no una mesa de incidentes.
- **Bloqueo:** IPs bloqueadas, alta y baja manual. Login bloqueado y rate limit quedan como eventos.
- **Acción administrativa de seguridad:** resolver alerta, bloquear IP. El cambio de permisos de usuario vive en Usuarios, no aquí.

No hay un tipo de evento dedicado a cambio de email. MFA queda cubierto por eventos 2FA/OTP.

### Auditoría admin — A + G

Tabla `hot_click_auditoria_admin_tb`. Campos: admin id, email, acción, entidad, entidad id, detalle (500), fecha, empresa. No guarda IP ni user-agent. Retención 90 días (`DataRetentionScheduler`). Consulta: `GET /api/admin/auditorias`.

Acciones que el código registra hoy:

| Acción | Cuándo |
| --- | --- |
| `APROBAR_SINPE`, `RECHAZAR_SINPE`, `AUTO_APROBAR_SINPE` | Comprobantes |
| `IMPERSONACION_INICIO`, `IMPERSONACION_FIN` | Ver como negocio |
| `PRODUCTO_CREADO`, `PRODUCTO_EDITADO`, `PRODUCTO_VISIBILIDAD`, `PRODUCTO_ELIMINADO` | Solo si quien escribe es admin de plataforma |
| `PEDIDO_CAMBIO_ESTADO` | Siempre, también el vendedor |
| `PEDIDO_PAGO_MANUAL`, `PEDIDO_ASIGNAR_GUIA`, `PEDIDO_PROCESAR_ENVIO` | Pedido |
| `EQUIPO_INVITAR`, `EQUIPO_CAMBIO_ROL`, `EQUIPO_ELIMINAR` | Solo si es admin de plataforma |

`registrar` escribe para cualquier rol. `registrarSiAdmin` filtra. La pantalla mezcla acciones del vendedor y del admin. No quedan registradas la suspensión del negocio, el cambio de plan, el cambio de visibilidad, el toggle de flags ni el de IA.

### Feature flags y observabilidad — A, solapadas con IA e Inicio

`/admin/superadmin` enciende o apaga flags por negocio (facturación, IA, POS, white label, entre otros). `/admin/ai-control` repite el interruptor de chat público y copilot, y además muestra consumo.

Observabilidad: empresas, pedidos, pagos, productos, usuarios, seguridad 24 h, webhooks, IA, tamaño de base, y uso por tenant. Es el tablero técnico. Parte de eso duplica el inicio y el control de IA.

### IA — A + G

Lo medido de verdad está en `hot_click_ai_uso_tb`: llamadas (créditos) y tokens de entrada y salida, por empresa, mes y año. `AiQuotaService.verificarYReservar` corre antes de llamar a Claude. El tope sale de `Plan.maxCreditosAi` y de flags (`copilot_emprendedor`, `ai_copilot`, `chat_publico`).

`GET /api/security/ai/dashboard` arma el panel. El USD es una estimación con precios constantes en el controller, no un ledger. Las alertas de cuota (advertencia, límite) se calculan al vuelo y no se guardan.

Quién usa IA en el producto: copilot del vendedor (`/api/admin/ai/**`, pantalla `/admin/copilot`, que es del negocio), chat público de tienda, y otras llamadas que pasan por la misma cuota. El panel no abre el prompt ni la conversación. No hay límite editable por usuario ni corte de abuso persistido. El modelo sale de configuración (`anthropic.model`), no de esta pantalla.

### Multipaís — A

País, moneda, locale, IVA y tasas. Guardar config. Es configuración global real, no un adorno.

### Soporte — A

`TicketSoporte`: `ABIERTO`, `ASIGNADO`, `RESUELTO`. Prioridad `ALTA`, `MEDIA`, `BAJA`. El vendedor abre el ticket; el admin asigna, escribe `notasAdmin` y resuelve. Es el único flujo de plataforma que ya tiene responsable y prioridad. La ruta exige `ADMIN` aunque el link diga `global.companies`. En HTTP, `/api/admin/soporte/**` exige rol `ADMIN`.

---

## 4. Beneficio para el negocio

| Ventana | Problema que resuelve | Beneficio | Quién hoy | Si se quita del menú | Decisión |
| --- | --- | --- | --- | --- | --- |
| Inicio | Orientar al operador | Bajo: no dice qué hacer | ADMIN | Se pierde el aterrizaje, no una operación | RECONSTRUIR |
| Tiendas y ficha | Saber y cambiar el estado de un negocio | Control, moderación, soporte | ADMIN | No se puede suspender ni entrar a un caso | MANTENER |
| Impersonar | Reproducir el problema del vendedor | Soporte, con rastro de inicio y fin | ADMIN | El soporte opera a ciegas o pide la clave | MANTENER |
| Usuarios | Cuentas, roles, bloqueo | Seguridad y soporte | ADMIN | No hay otro lugar para bloquear una cuenta | MANTENER |
| Aprobaciones | Alta de negocios, ofertas, cuentas de cobro | Control de quién publica | ADMIN | El marketplace publica solo | RECONSTRUIR la entrada, conservar las APIs |
| Reportes de producto | Denuncia de visitante | Moderación, fraude de catálogo | ADMIN | Queda la pausa automática y se pierde la revisión | FUSIONAR en Moderación |
| Configuración | Atajo a categorías y avisos | Bajo en política y métodos | ADMIN | El hub puede vivir en Sistema | RECONSTRUIR |
| Más herramientas | Un segundo índice | Ninguno | ADMIN | Nada se pierde si el sidebar está completo | ELIMINAR del menú |
| Pagos / SINPE / webhooks | Cobro del marketplace | Ingresos, fraude de comprobante | ADMIN | Los pagos quedan sin conciliación manual | MANTENER |
| Retiros | Pagar al vendedor | Operación de dinero | ADMIN | Se acumulan payouts (el umbral bajo sigue en automático) | MANTENER |
| Billing SaaS | Cobrar el plan | Ingresos de plataforma | ADMIN | Past-due invisible | MANTENER |
| Embudo | Ver caída de conversión | Análisis | ADMIN | Sigue el dato en API; se pierde la lectura | FUSIONAR en Inicio |
| Ads | Pauta del negocio | Del vendedor | ADMIN no entra | Ninguno en plataforma | REUBICAR |
| Recolección y Servicios Hot | Cumplir lo que HotClick opera en campo | Operación | ADMIN | Esas colas quedan sin dueño | MANTENER |
| Digitalización | Cargar inventario de un negocio | Operación, onboarding | ADMIN | Se corta el flujo de captura | MANTENER |
| Cola offline | Reintento local de la caja | Eficiencia del vendedor | Vendedor | En plataforma no hay cola que operar | REUBICAR |
| Facturas y fiscal | Comprobantes del perfil logueado | Cumplimiento, si el scope es el correcto | ADMIN | Investigar antes de esconder | INVESTIGAR |
| Homepage, categorías, marcas, cupones | Cómo se ve y se clasifica el marketplace | Crecimiento, control de catálogo | ADMIN | El home y el árbol quedan sin editor | MANTENER |
| Security Center | Ver ataques, alertas e IPs | Protección | ADMIN | Quedan los logs en base, sin operación | RECONSTRUIR la presentación |
| Auditoría | Quién hizo qué sobre un negocio | Investigación | ADMIN | Se pierde la consulta; la escritura sigue | MANTENER y completar huecos |
| Flags | Encender capacidades por negocio | Control | ADMIN | No se puede apagar IA o facturación por tenant | MANTENER |
| Observabilidad | Salud de plataforma y uso por tenant | Decisión técnica y de capacidad | ADMIN | Se pierde el drill-down | FUSIONAR lo accionable en Inicio; MANTENER el detalle |
| IA | Ver consumo y apagar chat o copilot | Costo y abuso | ADMIN | La cuota sigue en backend; se pierde el interruptor | RECONSTRUIR |
| Multipaís | Moneda e impuestos de la operación | Configuración global | ADMIN | Los cambios de país quedan en base | MANTENER |
| Soporte | Tickets con dueño | Soporte | ADMIN | El vendedor abre tickets que nadie ve | MANTENER |
| Política y métodos estáticos | Ninguno operativo | Ninguno | ADMIN | No cambia el comportamiento del sistema | ELIMINAR del menú |

---

## 5. Problemas

### El inicio no opera

Por qué estorba: cuatro totales no generan una decisión.  
Impacto: lo urgente (negocio pendiente, SINPE, reporte, alerta) está a dos o tres clics, en pantallas distintas.  
Solución: Inicio que lea el resumen de moderación, alertas de seguridad abiertas y past-due de billing. Esas APIs ya existen.

### Dos índices para lo mismo

Por qué estorba: Más herramientas repite retiros, billing, soporte, auditorías, observabilidad, servicios, recolecciones, aprobaciones y reportes.  
Impacto: no se sabe cuál es la entrada canónica. Dos de sus links (garantías, clientes) devuelven al inicio.  
Solución: quitar el hub del menú. Conservar la ruta hasta la fase de reconstrucción para no romper bookmarks, y dejar de destacarla.

### Enlaces que el guard anula

Por qué estorba: `/admin/ads` está en Operar plataforma y en `PREFIJOS_TENANT_OPS`. Cotizaciones y publicaciones están bajo `SuperAdminGuard` y también en esa lista.  
Impacto: el operador cree que la pantalla falló.  
Solución: sacarlas del menú de plataforma. Siguen en la experiencia del vendedor.

### Moderación partida y sin caso

Por qué estorba: aprobar un negocio, un SINPE, un payout y un reporte son colas distintas con la misma pregunta (¿intervengo?). El resumen las cuenta juntas y las pantallas las separan. No hay asignado ni “qué decidió el moderador” más allá del estado final.  
Impacto: se puede aprobar sin dejar contexto, y no se ve reincidencia.  
Solución P0: una entrada Moderación que abra la bandeja actual y los reportes. Solución P2: modelo de caso. No inventar la tabla en esta fase.

### Dinero en cuatro nombres

Por qué estorba: pagos, retiros, suscripciones y “finanzas” suenan igual. Finanzas es del vendedor.  
Impacto: se busca un retiro en la pantalla de webhooks.  
Solución: un grupo Dinero con tres hijas que ya existen, y finanzas del negocio fuera.

### Seguridad como archivo de logs

Por qué estorba: ocho pestañas, con Sentry y Sistema al mismo nivel que Alertas. El evento, la alerta y el bloqueo están modelados; el incidente no.  
Impacto: un brute force y un error de aplicación compiten por atención.  
Solución: abrir en Alertas y bloqueos. Eventos y sesiones quedan como evidencia, no como home.

### Configuración que no configura

Por qué estorba: la política de moderación y los métodos de pago no persisten. Parecen reglas del negocio y son copy del prototipo.  
Impacto: alguien puede creer que “precio mínimo ₡1.000” está activo. No lo está, salvo que otra validación de producto lo imponga por su cuenta. Estas cuatro reglas no están cableadas.  
Solución: sacarlas del menú. Si más adelante una regla es real, se edita donde se aplica.

### Fiscal colgado del JWT

Por qué estorba: facturas y config fiscal en el menú de plataforma usan la empresa de la sesión.  
Impacto: se puede editar el certificado del tenant equivocado o creer que se ven todas las facturas.  
Solución: investigar el scope antes de moverlas a Dinero o devolverlas al vendedor.

### Permisos que no corresponden a personas

Por qué estorba: el sidebar anuncia `global.companies` en soporte, y la ruta exige `ADMIN`. Los roles staff están muertos. Categorías no pasa por `ITOnlyGuard`.  
Impacto: el menú promete una separación que el guard no cumple. Un solo `ADMIN` lo puede todo, incluyendo suspender e impersonar.  
Solución: no reactivar staff en el primer corte. Documentar el mapa (sección 9) y corregir guards incoherentes cuando se toque el menú.

### Auditoría que no alcanza para un incidente

Por qué estorba: suspensión, plan, visibilidad, flags e IA no quedan como acciones. No hay IP. A los 90 días se borra. Parte de las filas las escribe el vendedor (`PEDIDO_CAMBIO_ESTADO`).  
Impacto: “quién suspendió este negocio y desde dónde” no se puede responder con esta tabla.  
Solución P1: registrar suspensión, reactivación, plan y visibilidad con el mismo servicio que ya existe. IP y alargar retención son P2, porque cambian esquema.

### IA medida y no administrada

Por qué estorba: se ve el consumo y se puede apagar un flag. No se cambia el tope, no se ve abuso persistido, el costo no es contable.  
Impacto: un negocio puede gastar el cupo del plan sin que el admin tenga otra palanca que apagar el flag.  
Solución P1: dejar claro en la misma pantalla cupo, uso, costo estimado y interruptor. Editar topes es P3.

### Lo automático no tiene tablero, y no hace falta uno entero

Payouts chicos, SINPE, retención y renovación corren solos. Meter una consola de cron en el Admin de negocio mezcla ingeniería con operación.  
Solución: en Inicio, solo el resultado que pide acción (payouts que siguen pendientes por encima del umbral, SINPE pendiente). La lista de jobs queda fuera del menú.

---

## 6. Clasificación

Letra = tipo de implementación. Decisión = qué hacer con ella en el menú nuevo. Eliminar del menú no borra la ruta en la fase siguiente hasta que se decida el redirect.

| Ventana | Letra | Decisión |
| --- | --- | --- |
| Inicio | G | RECONSTRUIR |
| Tiendas | A | MANTENER |
| Ficha de negocio | A | MANTENER |
| Impersonar | A | MANTENER |
| Usuarios | A | MANTENER |
| Aprobaciones | G | RECONSTRUIR |
| Pestaña productos legacy | D | FUSIONAR como historial residual, no como cola viva |
| Reportes de producto | A | FUSIONAR en Moderación |
| Configuración hub | B | RECONSTRUIR |
| Política y métodos de pago | C | ELIMINAR |
| Notificaciones derivadas de colas | B | FUSIONAR en Inicio |
| Más herramientas | E | ELIMINAR |
| Pagos y webhooks | A | MANTENER |
| Retiros | A | MANTENER |
| Billing SaaS | A | MANTENER |
| Embudo | A | FUSIONAR en Inicio |
| Ads | F | REUBICAR al vendedor |
| Recolecciones | A | MANTENER |
| Servicios Hot | A | MANTENER |
| Captura y paquetes | A | MANTENER |
| Cola offline | F | REUBICAR al vendedor |
| Facturas | B | INVESTIGAR |
| Compras D-105 | B | INVESTIGAR |
| Config fiscal | B | INVESTIGAR |
| Homepage, categorías, marcas, cupones | A | MANTENER |
| Security Center | G | RECONSTRUIR |
| Auditorías | G | MANTENER |
| Feature flags | A | MANTENER |
| Observabilidad | E con Inicio e IA | FUSIONAR lo accionable; MANTENER detalle |
| Control de IA | G | RECONSTRUIR |
| Multipaís | A | MANTENER |
| Soporte | A | MANTENER |
| Cotizaciones y publicaciones | F | REUBICAR al vendedor |
| Garantías y clientes en herramientas | F | REUBICAR (ya viven en el vendedor) |

---

## 7. Funcionalidades faltantes

Cada fila es una necesidad que el código no cubre. Prioridad de cuándo construirla, no de si el menú la nombra ya.

### Casos de moderación

Problema: la bandeja termina en aprobado, rechazado o resuelto, sin responsable ni reincidencia.  
Necesidad: caso con pendiente, en revisión, decisión y cierre; nota interna; quién lo tomó.  
Beneficio: se puede responder qué pasó después de la decisión.  
Prioridad: P2. En P0 se usa la bandeja actual unificada. No hay entidad Caso hoy.

### Incidente de seguridad

Problema: hay eventos y alertas, y no un incidente con estado y dueño.  
Necesidad: promover una alerta crítica a incidente (abierto, contenido, cerrado) sin convertir el log en la pantalla principal.  
Beneficio: una fuerza bruta deja de ser una fila más.  
Prioridad: P3. En P1 se reordena lo que ya está persistido.

### Auditoría de acciones críticas que hoy no se escriben

Problema: suspender, cambiar plan, visibilidad, flags e IA no quedan en `hot_click_auditoria_admin_tb`.  
Necesidad: las mismas columnas de siempre (quién, acción, entidad, cuándo, empresa, detalle).  
Beneficio: investigar una suspensión.  
Prioridad: P1 para suspensión, plan y visibilidad. P2 para IP, user-agent y flags.

### Límites de IA administrables

Problema: el tope es del plan y de flags. El panel no lo edita. El USD no es un cargo.  
Necesidad P1: lectura fiel de cupo, uso y costo estimado, y el interruptor que ya existe.  
Necesidad P3: tope por negocio distinto del plan, alerta persistida, corte por abuso.  
Beneficio: saber si la IA cuesta y si un tenant se la está comiendo.  
No hace falta un quinto producto “IA” con Uso, Consumo, Costos, Límites y Auditoría como cinco rutas: son vistas del mismo `ai_uso` y de los flags.

### Staff separado

Problema: una sola persona `ADMIN` modera, paga, impersona y cambia seguridad.  
Necesidad: cuando haya más de un operador, usar `global.approvals`, `global.companies` y `global.metrics`. No crear roles nuevos con otros nombres.  
Beneficio: el de soporte no bloquea IPs ni cambia flags.  
Prioridad: P3. Reabrir `SUPPORT` / `FINANCE` / `TRUST` sin un diseño de guards arrastra el bug de soporte (link con permiso, ruta solo ADMIN).

### Lo que no se agrega

- Sección Analítica aparte. Embudo y observabilidad alcanzan. Un dashboard de vanidad repetiría el inicio actual.
- Sección Roles y permisos como producto. Usuarios ya cambia el rol. Una matriz vacía no opera el negocio.
- Consola de todos los schedulers.
- Estados de negocio que el modelo no tiene (En revisión, Restringido, Bloqueado). Hasta que el negocio los pida, la ficha usa `PENDIENTE_APROBACION`, `ACTIVO`, `SUSPENDIDO`, `INACTIVO` y `RECHAZADO`.
- Denuncias genéricas de usuario o de negocio. Hoy existe `ReporteProducto`. Inventar las otras sin flujo de visitante sería una pantalla vacía.

---

## 8. Nueva arquitectura

Sale de las colas y las APIs que ya existen. El esquema de referencia (actividad, contenido, incidentes, administrar negocio como hijas vacías) se recortó donde no hay datos.

```text
ADMIN  (solo rol ADMIN)
│
├── Inicio
│     Colas del resumen de moderación
│     Alertas de seguridad abiertas
│     Negocios PENDIENTE_APROBACION
│     SINPE y retiros pendientes
│     Past-due de suscripción
│     Embudo 7 días, una sola lectura
│
├── Moderación
│   ├── Bandeja          /admin/aprobaciones (empresas, ofertas, cobro, y accesos a SINPE, payouts, testimonios, recolecciones)
│   ├── Reportes         /admin/reportes-producto
│   └── Decisiones       /admin/auditorias filtrado a acciones de moderación (P1, misma API)
│
├── Negocios
│   ├── Todos            /admin/empresas
│   └── Ficha            /admin/empresas/:id
│         incluye Ver como negocio, con banner de admin y las auditorías que ya se escriben
│
├── Dinero
│   ├── Cobros           /admin/pagos
│   ├── Retiros          /admin/payouts
│   └── Suscripciones    /admin/saas-billing
│
├── Marketplace
│   ├── Homepage
│   ├── Categorías
│   ├── Marcas
│   └── Cupones
│
├── Operación HotClick
│   ├── Servicios
│   ├── Recolección
│   └── Digitalización   captura y paquetes
│
├── Soporte              /admin/soporte
│
├── Seguridad            /admin/security
│   home = alertas y bloqueos
│   evidencia = eventos, sesiones, IPs, usuarios
│   Sentry queda en una pestaña secundaria, no en el primer nivel del menú
│
├── IA                   /admin/ai-control
│
├── Usuarios             /admin/usuarios
│
├── Auditoría            /admin/auditorias
│
└── Sistema
    ├── Flags            /admin/superadmin
    ├── Observabilidad   /admin/observabilidad
    ├── Multipaís
    └── Configuración    solo lo que persiste (comisión de lectura, categorías)
```

Fuera de este menú, en la experiencia del negocio: POS, catálogo, pedidos, clientes, finanzas y billetera del vendedor, copilot, ads, cola offline, garantías, cotizaciones, publicaciones, blog, equipo.

### Inicio: cada número tiene una decisión

| Dato | Origen actual | Decisión |
| --- | --- | --- |
| Empresas pendientes | resumen `empresas` | Abrir la bandeja y aprobar o rechazar |
| Reportes de producto | resumen `reportesProducto` | Resolver o descartar, y pausar si corresponde |
| SINPE pendiente | resumen `sinpe` | Confirmar o rechazar el comprobante |
| Retiros pendientes | resumen `payouts` | Aprobar o rechazar los que superan el umbral automático |
| Cuentas de cobro | resumen `cuentasCobro` | Aprobar el método antes de que el vendedor cobre |
| Alertas de seguridad activas | `GET /api/security/dashboard` | Resolver o bloquear IP |
| Past-due | billing de plataforma | Entrar a la ficha de suscripción de ese negocio |
| Embudo 7 días | `GET /api/admin/embudo` | Ver si checkout o pago se cayeron; no es un botón de moderación |

No van al inicio: ventas totales, cantidad de vendedores, tamaño de la base, costo de IA del mes (eso vive en IA), ni las reglas estáticas de política.

### Moderación como herramienta, no como log

P0 no crea estados nuevos. La bandeja ya tiene pendiente y una decisión (aprobado, rechazado, resuelto, descartado). P2 añade en revisión, asignado y nota de mesa cuando exista modelo. Hasta entonces, “qué decidió el moderador” es el estado de la solicitud o del reporte más el comentario o `notasAdmin` que esa API ya guarda.

### Ver como negocio

Se conserva. Condiciones que la fase de reconstrucción debe respetar, sin rediseñar el JWT en el primer corte de menú:

- Banner visible de que la sesión es de administrador.
- La acción de entrar y salir sigue auditada.
- No se agregan botones de suspender o cambiar permisos dentro de la sesión impersonada: esas acciones se hacen en la ficha, como ADMIN, antes o después.
- Los riesgos de revocación y de webhooks quedan escritos para un corte de seguridad aparte. No se “arreglan” cambiando el orden del menú.

### Diferencia de experiencias

| Trabajo | Dónde vive |
| --- | --- |
| Vender, cobrar en caja, editar su catálogo | Experiencia del negocio |
| Aprobar quién publica, denuncias, tickets | Admin: Moderación, Soporte, Negocios |
| Conciliar SINPE, pagar retiros, cobrar el plan | Admin: Dinero |
| Bloquear IP, ver login fallido | Admin: Seguridad |
| Apagar IA de un negocio, ver cupo | Admin: IA |
| Publicar home y categorías | Admin: Marketplace |
| Foto de inventario y recolección GAM | Admin: Operación HotClick |
| Auto-aprobar un retiro chico, pausar a los 3 reportes, cuota de IA | Sistema automático, visible solo por su resultado |

---

## 9. Roles y permisos

Hoy entra una sola persona: `ADMIN`. Puede suspender, bloquear, impersonar, cambiar flags, ver seguridad y borrar usuarios. Eso es exceso para cuando haya más operadores, y es el comportamiento real de producción ahora. No se parte el rol en esta fase.

Mapa para cuando se reactive staff. Usa solo permisos que ya están en `Constants.java`.

| Capacidad | Hoy | Futuro |
| --- | --- | --- |
| Inicio (lectura de colas) | ADMIN | Cualquier operador de plataforma |
| Bandeja, reportes de producto | ADMIN | `global.approvals` |
| Negocios: listar, ficha, visibilidad, recolecciones, servicios | ADMIN | `global.companies` |
| Soporte | ADMIN (el link miente con `global.companies`) | Decidir en P3: o pasa a `global.companies` también en el guard y en HTTP, o se queda en ADMIN |
| Pagos, retiros, billing, embudo | ADMIN | `global.metrics` |
| Usuarios: rol, bloqueo, borrado | ADMIN | Sigue en ADMIN |
| Impersonar | ADMIN (`@PreAuthorize`) | Sigue en ADMIN |
| Security Center | ADMIN | Sigue en ADMIN. No existe `global.security` |
| IA, flags, multipaís, homepage, cupones, auditoría | ADMIN | Sigue en ADMIN |
| Marketplace categorías | ADMIN en el menú; la ruta de frontend no está en `ITOnlyGuard` | Corregir el guard al tocar el menú |

Roles de negocio que no son Admin: `EMPRENDEDOR` (dueño y miembros; el JWT de membresía sale como emprendedor), `USUARIO_FINAL` (comprador). Planes `EMPRENDEDOR`, `PYME`, `NEGOCIO_PLUS` limitan features del vendedor, no abren este menú.

Roles de caja (`CAJERO`, `GERENTE`, `SUPERVISOR`) siguen en POS. `V135` marcó inactivos varios roles de tenant; el menú de plataforma no depende de ellos.

Acciones que no se delegan aunque exista staff: suspender, bloquear usuario, cambiar rol, impersonar, flags, límites de IA, config fiscal, borrar usuario.

---

## 10. Prioridades

### P0 — operar el menú con lo que ya funciona

- Sidebar de plataforma con la estructura de la sección 8, reutilizando rutas.
- Quitar del menú: Más herramientas, ads, cola offline, política estática, métodos de pago estáticos, garantías y clientes.
- Inicio accionable con resumen de moderación, alertas y past-due. Sin endpoint nuevo si esos tres ya responden.
- Moderación como grupo: bandeja + reportes. Misma API.
- Negocios: listado + ficha, estados actuales, impersonar como está.
- No borrar rutas legacy: los alias pueden seguir redirigiendo.

### P1 — control

- Seguridad abre en alertas y bloqueos.
- Dinero agrupado en navegación (tres rutas actuales).
- Auditoría: escribir suspensión, reactivación, cambio de plan y visibilidad con `AuditoriaAdminRegistroService`.
- IA: la misma pantalla, con cupo, uso, costo estimado e interruptor leíbles como una sola herramienta.
- Decisiones de moderación: filtro de la auditoría existente, no una tabla nueva.
- Cerrar el agujero de guarda de `/admin/categorias` al mover el ítem, si el backend no lo cubre solo. Verificar el controller antes de asumir el hueco.

### P2 — mesa y rastro

- Caso de moderación (asignado, nota, prioridad, en revisión) con migración Flyway. Hasta entonces no hay pantalla vacía de “casos”.
- IP y user-agent en auditoría admin (cambio de esquema).
- Impersonación: revocación y banner. Es seguridad, no cosmética del menú. Va en su propio corte, después de leer `ImpersonacionService` y el listado de webhooks.

### P3 — cuando haya más de un operador o más costo de IA

- Reactivar staff sobre `global.*` alineando link, guard de React y `SecurityAuthorizationRules`.
- Incidente como entidad, nacido de una alerta.
- Tope de IA editable por negocio y alerta de cuota persistida.
- Consola de jobs, solo si un fallo automático ya no se ve por su cola (SINPE, payout, billing).

---

## 11. Plan de implementación

Orden de la fase siguiente. Esta auditoría no lo ejecuta.

1. **Menú.** Cambiar `buildAdminItLinks` y las etiquetas. Las rutas de `AppRoutes.tsx` se quedan. Los links rotos dejan de renderizarse. Comprobar con un usuario `ADMIN` que cada href abre la pantalla y que un `EMPRENDEDOR` sigue viendo Sistema.
2. **Inicio.** Conectar `SuperAdminHome` al resumen de moderación, al dashboard de seguridad y al listado de billing. Quitar los cuatro KPIs de vanidad o dejarlos en observabilidad.
3. **Moderación y Dinero.** Solo agrupación visual. No unificar controladores.
4. **Auditoría de suspensión y plan.** Un registro por acción en el servicio que ya escribe la tabla. Test del servicio.
5. **Seguridad e IA.** Reordenar pestañas y copiar en claro cupo contra uso. Sin modelo nuevo.
6. **Recién entonces** casos (P2) o staff (P3), cada uno con migración y prueba, en cortes separados.

Criterio de cada corte: el vendedor no cambia de menú, el ADMIN no pierde una API que hoy usa, y no aparece una pantalla cuyo backend no exista.

### Qué no hacer en la reconstrucción

- Mantener una pantalla porque ya está en el sidebar.
- Crear Analítica, Incidentes o Roles para llenar el árbol.
- Cambiar estados de `Empresa` “para que coincidan con el diagrama”.
- Borrar `AdminAprobaciones` y sustituirla por una tabla de logs.
- Mezclar el sistema del vendedor dentro del Admin de plataforma.
- Corregir de paso la revocación del JWT de impersonación dentro del PR del menú.

---

## Fuentes en el código

- Menú: `Hot_click_outlet/frontend/src/layouts/admin/adminItJobs.ts`, `adminSidebarLinks.ts`
- Rutas: `Hot_click_outlet/frontend/src/app/AppRoutes.tsx`
- Guards: `Hot_click_outlet/frontend/src/app/routeGuards.tsx`, `AdminRoleSwitch.tsx`
- Roles: `Hot_click_outlet/frontend/src/utils/sistemaUser.ts`, `Hot_click_outlet/src/main/java/com/hotclick/security/PlatformStaff.java`, migración `V135__limpiar_roles_muertos.sql`
- Resumen de moderación: `ModeracionResumenService.java`
- Estados de negocio: `EmpresaAdminService.ESTADOS_VALIDOS`
- Auditoría: `AuditoriaAdmin.java`, `AuditoriaAdminRegistroService.java`, `Constants.DIAS_RETENCION_AUDITORIA_ADMIN`
- Reglas estáticas: `frontend/src/prototipo/admin/adminData.ts` (`REGLAS_MODERACION`)
