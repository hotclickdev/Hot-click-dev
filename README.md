# HOTCLICK

Marketplace y operación comercial para Costa Rica. HOTCLICK vende su propio catálogo de outlets y liquidación, y al mismo tiempo da a emprendedores y negocios una tienda con marca, plan y herramientas de venta.

Producción: <https://hotclick.lat/>

Este documento está escrito para dos lecturas. Quien dirige el producto puede quedarse en las primeras secciones. Quien desarrolla o mantiene el sistema continúa con el entorno local, la arquitectura y las reglas de cambio.

---

## El producto

HOTCLICK es un SaaS multi-tenant. Cada negocio opera aislado del resto. La plataforma conserva el catálogo propio y, además, publica las tiendas de terceros en el mismo marketplace.

El comprador recorre el catálogo, arma el carrito y paga con tarjeta (Tilopay), SINPE Móvil o continúa la compra por WhatsApp. El vendedor administra productos, inventario, pedidos, caja y su marca. La operación de plataforma aprueba negocios, liquida pagos, factura y supervisa la seguridad.

| Plan | Espacio del vendedor | Alcance |
| --- | --- | --- |
| Emprendedor | `/emprendedor` | Plan de entrada. Comisión de HOTCLICK sobre la venta y cupo de productos. |
| PyME | `/pyme` | Reportes, compras, tarjetas de regalo y herramientas de inteligencia artificial, según el plan. |
| Negocio Plus | `/negocio-plus` | Operación más amplia: sucursales, bodegas y el resto de capacidades del catálogo de planes. |

La suscripción de los planes de pago se cobra con ONVO. El checkout de la tienda no usa ONVO: ahí el cobro es Tilopay, SINPE Móvil o WhatsApp. Stripe permanece en el backend para cobros y precios recurrentes anteriores.

Cada negocio numera sus SKU con el formato `E{empresa}-0001`. El identificador global lo ve la administración. El comprador no ve el SKU. El código de barras (EAN/UPC) es opcional al crear o editar un producto.

---

## Qué incluye

**Compra.** Inicio, catálogo, ficha con variantes y reseñas, descubrimiento, carrito, checkout, pedidos, perfil, lista de deseos y tienda de cada vendedor en `/tienda/:slug`. También hay recuperación de carrito abandonado, cotización B2B y encargos por enlace, sin entrar al panel.

**Venta en el local.** Punto de venta con turno de caja, historial y cobro por código QR. Inventario con kardex, códigos de barra, captura offline y paquetes. Compras a proveedores en los planes que lo incluyen.

**Administración del negocio.** Productos (alta asistida, carga masiva e importación), pedidos con guía de Correos de Costa Rica, finanzas, billetera, reportes, clientes, equipo, marcas, categorías, promociones, cupones, garantías y tickets de soporte.

**Plataforma.** Empresas, usuarios, aprobaciones, pagos, liquidaciones, facturas electrónicas de Hacienda, planes, seguridad, observabilidad y atribución de anuncios.

**Acompañamiento.** Copiloto con Claude para el negocio, pronóstico, chat de tienda y bot de Telegram con menú según rol y plan: alta de productos personalizados y ajuste de unidades desde inventario.

**Presencia.** Blog, directorio de emprendimientos, páginas institucionales y feed de Google Merchant en `https://hotclick.lat/api/public/feed/shopping.xml`.

---

## Superficies principales

| Superficie | Ruta | Uso |
| --- | --- | --- |
| Tienda | `/`, `/productos`, `/checkout` | Compra pública |
| Tienda del vendedor | `/tienda/:slug` | Marca, catálogo y checkout propios |
| Cuenta del comprador | `/mis-pedidos`, `/perfil`, `/wishlist` | Historial y lista de deseos |
| Vendedor | `/emprendedor`, `/pyme`, `/negocio-plus` | Operación según el plan |
| Administración | `/admin` | Panel. El menú cambia según el rol de plataforma o el plan del negocio |
| Cobro de caja | `/pos/pago/:token` | Pago del código QR, sin sesión de cajero |
| Alta | `/registro`, `/registro-empresa`, `/login` | Cuenta de comprador, negocio e inicio de sesión |

`/visitante` redirige al marketplace. `/prototipo/*` redirige al área del plan correspondiente.

El panel de administración agrupa, entre otras, estas áreas: inicio, catálogo, inventario, pedidos, encargos, punto de venta, compras, finanzas, clientes, marca, contenido comercial, soporte, copiloto, empresas, facturación, planes, seguridad y configuración.

---

## Cumplimiento

HOTCLICK publica las políticas que exige la operación en Costa Rica y registra el consentimiento del usuario.

| Documento | Ruta |
| --- | --- |
| Privacidad (Ley N.° 8968, derechos ARCO) | `/privacidad` |
| Términos y condiciones | `/terminos` |
| Devoluciones (Ley N.° 7472) | `/devoluciones` |
| Envíos | `/envios` |
| Cookies | `/cookies` |
| Acuerdo de vendedores | `/acuerdo-vendedores` |

El registro, el checkout y el alta de vendedor exigen consentimiento. La bitácora, con dirección IP, queda en `hot_click_consentimiento_log_tb`. El canal ARCO es <hotclick.cr@gmail.com>. El detalle está en [docs/COMPLIANCE.md](docs/COMPLIANCE.md) y los textos en [docs/legal/](docs/legal/).

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | Spring Boot 3.4.4, Java 21 |
| Frontend | React 19.2, TypeScript, Vite 8, Tailwind CSS 4, Zustand 5, TanStack Query, React Router 7 |
| Base de datos | PostgreSQL 18. Producción en Amazon RDS, con el esquema bajo Flyway. Local en Docker, perfil `dev` |
| Migraciones | Flyway. 136 archivos. La más reciente es `V139__atribucion_ads_metricas.sql` |
| Archivos | Amazon S3, bucket `hotclick-media` (us-east-2) |
| Correo | SendGrid |
| Identidad | JWT con refresh, 2FA TOTP, passkeys, Clerk (Google, Microsoft, Apple, GitHub) y Cloudflare Turnstile |
| Inteligencia artificial | Claude para el chat de tienda, el copiloto y Telegram. Embeddings con Voyage. El sidecar NVIDIA no atiende el copiloto |
| Mensajería | WhatsApp (Meta Cloud API), Telegram y SMS opcional al cambiar la cuenta de cobro |
| Medición | Google Analytics 4 con consentimiento, PostHog, Microsoft Clarity, Meta Pixel y Sentry |
| Trabajos programados | ShedLock en cada job |
| Construcción | Maven en `maven/bin/`. Frontend con pnpm 11 y Node 22.13 o superior |

Las versiones contadas desde el repositorio están en [docs/GENERATED_STACK.md](docs/GENERATED_STACK.md). Si ese archivo y este README no coinciden en Flyway, prevalece el directorio `Hot_click_outlet/src/main/resources/db/migration/`.

---

## Entorno local

El desarrollo no se conecta a la base de producción. El perfil `dev` detiene el arranque si el host de la base no es local.

```bash
cd Hot_click_outlet
docker compose -f docker-compose.dev.yml up -d

cd ..
.\maven\bin\mvn -pl Hot_click_outlet spring-boot:run "-Dspring-boot.run.profiles=dev"
```

La API queda en `http://localhost:8080`.

```bash
cd Hot_click_outlet/frontend
pnpm install
pnpm dev
```

La interfaz queda en `http://localhost:3000` y envía `/api` al puerto 8080.

Cuenta de administración inicial: `admin@hotclick.com` / `Admin1234!`.

En una base vacía, Flyway marca como aplicadas las migraciones hasta V136 y no las vuelve a ejecutar. V1 es un volcado heredado y no se puede reaplicar en cadena. Hibernate completa el esquema de las entidades. Las migraciones nuevas, de V137 en adelante, sí se aplican al reiniciar. Si la base local queda inconsistente:

```bash
cd Hot_click_outlet
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

El build de la interfaz es obligatorio antes de integrar cambios y antes de construir la imagen. Docker no compila React. Sin ese build, producción sigue sirviendo la interfaz anterior.

```bash
cd Hot_click_outlet/frontend
pnpm build
```

La salida queda en `Hot_click_outlet/src/main/resources/static/`.

### Cuentas de prueba

Al arrancar con perfil `dev`, el sistema crea estas cuentas si no existen. No vencen. Contraseña: `Prueba1234`. La de administración sigue siendo `Admin1234!`.

| Rol | Correo | Plan |
| --- | --- | --- |
| Administración | `admin@hotclick.com` | — |
| Emprendedor | `emprendedor@hotclick.test` | EMPRENDEDOR |
| PyME | `pyme@hotclick.test` | PYME |
| Negocio Plus | `negocioplus@hotclick.test` | NEGOCIO_PLUS |

Fuera de las pruebas automatizadas, el arranque puede borrar tiendas y productos que no pertenezcan a estas cuentas. Conserva la administración, las cuentas de prueba y el mostrador del punto de venta. La misma acción está en Configuración, con la frase `ELIMINAR PLATAFORMA`, y en [`scripts/reset_qa_keep_admin.sql`](scripts/reset_qa_keep_admin.sql). Conviene respaldar antes. No elimina archivos, embeddings, identidades de Clerk ni publicaciones externas.

---

## Producción

| Pieza | Ubicación |
| --- | --- |
| Aplicación | EC2 en us-east-2, con Docker, Nginx y certificado |
| Base de datos | Amazon RDS, PostgreSQL 18, conexión cifrada |
| Imágenes y archivos | Amazon S3, bucket `hotclick-media` |
| Dominio | `hotclick.lat` |
| Despliegue | `Hot_click_outlet/docker-compose.prod.yml` |

El procedimiento de despliegue está en [CLAUDE.md](CLAUDE.md). Existe un compose alterno para Lightsail, `docker-compose.lightsail.yml`, con PostgreSQL en el mismo host.

---

## Estructura del repositorio

```text
Hot-click-dev/
├── Hot_click_outlet/
│   ├── src/main/java/com/hotclick/   API, dominio, seguridad y jobs
│   ├── src/main/resources/           configuración, Flyway y la interfaz compilada
│   ├── frontend/                     React y TypeScript
│   ├── Actualizado.sql               referencia del esquema
│   └── docker-compose.*.yml
├── docs/                             legal, seguridad y controles de ingeniería
├── security-tools/                   revisión de prompts; no atiende el copiloto
├── CLAUDE.md                         operación del repositorio
└── README.md
```

En el frontend, las páginas no llaman a la red por su cuenta. Esa responsabilidad está en `frontend/src/services/`. El estado de sesión, carrito y lista de deseos está en `frontend/src/store/`. Las rutas están en `frontend/src/app/AppRoutes.tsx`.

---

## Reglas de cambio

Estas reglas evitan fallos que el compilador no detecta.

**Esquema.** Un cambio de entidad en `com.hotclick.model` lleva su migración `V{N}__descripcion.sql`, con un número mayor que 136, escrita para poder ejecutarse más de una vez, y el mismo SQL al final de `Hot_click_outlet/Actualizado.sql`. En local se verifica con el perfil `dev`. En producción el esquema no lo modifica el ORM.

**Aislamiento y base de datos.** Cada recurso identificado por id comprueba que pertenece al negocio de la sesión. No se usan bloqueos de sesión de PostgreSQL, variables de sesión, `LISTEN`/`NOTIFY` ni sentencias preparadas que sobrevivan al request. Los jobs se coordinan con ShedLock. Los consecutivos, como los de Hacienda, se reservan con un `UPDATE … RETURNING` en una transacción corta, sin llamadas externas dentro de ella.

**Dinero.** Los montos son enteros en colones, sin decimales. En la interfaz se formatean con `Intl.NumberFormat('es-CR')`.

**Interfaz.** TypeScript, sin `any`. La compilación con `pnpm build` forma parte del cambio, no de un paso posterior.

**Credenciales.** No se escriben llaves en el código. El control de secretos y el análisis de dependencias forman parte de la integración continua. El detalle operativo queda fuera de este documento.

**Retención.** La auditoría de administración se conserva 90 días. Los carritos abandonados ya vencidos, 30 días.

En cada pull request, además de las pruebas de backend y de interfaz, se exige migración cuando cambia el esquema, aislamiento entre negocios, interfaz compilada al día, pruebas en pago, identidad, caja y billetera, y un respaldo diario que exista y no esté vacío. El catálogo de controles está en [docs/AGENTES_ENG_GATES.md](docs/AGENTES_ENG_GATES.md).

---

## Documentación de apoyo

| Documento | Para qué sirve |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | Comandos, despliegue y restricciones de infraestructura |
| [Hot_click_outlet/frontend/README.md](Hot_click_outlet/frontend/README.md) | Scripts y build de la interfaz |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Cumplimiento, SEO y plataformas externas |
| [docs/security/](docs/security/) | Identidad, permisos, segundo factor y respuesta a incidentes |
| [docs/GENERATED_STACK.md](docs/GENERATED_STACK.md) | Versiones leídas del repositorio |
| [docs/AGENTES_ENG_GATES.md](docs/AGENTES_ENG_GATES.md) | Controles de cada pull request |
| [DOCUMENTACION.md](DOCUMENTACION.md) | Documento técnico extenso. Si contradice este README o `CLAUDE.md`, prevalecen estos dos |

---

## Contacto

HOTCLICK · Costa Rica  
<hotclick.cr@gmail.com> · WhatsApp +506 8666-7888
