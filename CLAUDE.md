# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos principales

El proyecto incluye una instalación local de Maven en `maven/bin/`. Usar `.\maven\bin\mvn` en lugar de `mvn` global.

```bash
# Compilar
.\maven\bin\mvn clean package

# Ejecutar la aplicación
.\maven\bin\mvn spring-boot:run

# Ejecutar pruebas
.\maven\bin\mvn test

# Compilar sin ejecutar pruebas
.\maven\bin\mvn clean package -DskipTests
```

La aplicación corre en `http://localhost:8080`.

## Frontend React (Hot_click_outlet/frontend/)

El frontend React vive dentro del mismo proyecto Spring Boot.

```bash
# Servidor de desarrollo (puerto 3000, proxy /api → 8080)
cd Hot_click_outlet/frontend && pnpm dev

# Build de producción → src/main/resources/static/
cd Hot_click_outlet/frontend && pnpm build

# Build con watch
cd Hot_click_outlet/frontend && pnpm build:watch

# Instalar dependencias
cd Hot_click_outlet/frontend && pnpm install
```

El frontend compilado se sirve desde Spring Boot en producción. `SpaController.java` redirige rutas SPA a `index.html`.

## Arquitectura

Proyecto Spring Boot 3.4.4 con Java 24. El código vive bajo `Hot_click_outlet/`.

- **Punto de entrada**: `Hot_click_outlet/src/main/java/com/hotclick/AppApplication.java`
- **Paquete base**: `com.hotclick`
- **Controladores REST**: `com.hotclick.controller`
- **Modelos JPA**: `com.hotclick.model`
- **Servicios**: `com.hotclick.service`
- **Repositorios**: `com.hotclick.repository`
- **Seguridad**: `com.hotclick.security` (JWT)
- **Configuración**: `Hot_click_outlet/src/main/resources/application.properties`
- **Base de datos**: PostgreSQL en Supabase (`ddl-auto=none`, esquema en `Hot_click_outlet/Actualizado.sql`)

### Principales endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio |
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/auth/register` | Registro de usuario |
| GET | `/api/productos` | Catálogo paginado |
| POST | `/api/pedidos` | Crear pedido |
| POST | `/api/payment/checkout` | Iniciar pago PayXpert |
| POST | `/api/webhooks/payxpert` | Webhook de pagos |
| GET | `/api/admin/dashboard/**` | KPIs para panel admin |

## Convenciones

- Los controladores REST se ubican en `com.hotclick.controller` y usan `@RestController` con `@RequestMapping("/api")` como prefijo de ruta.
- Naming strategy: `PhysicalNamingStrategyStandardImpl` — los nombres de entidad deben coincidir exactamente con los nombres de columna/tabla en BD (minúsculas).
- Todos los montos monetarios son enteros en colones costarricenses (₡), sin decimales.
- **Nunca cambiar `ddl-auto=none`**; todo cambio de esquema se aplica manualmente con `Actualizado.sql`.
