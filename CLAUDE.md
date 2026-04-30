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

## Arquitectura

Proyecto Spring Boot 3.4.4 con Java 24. Estructura estándar Maven bajo `app/`.

- **Punto de entrada**: `app/src/main/java/com/hotclick/app/AppApplication.java`
- **Paquete base**: `com.hotclick.app`
- **Controladores REST**: `com.hotclick.app.controller`
- **Configuración**: `app/src/main/resources/application.properties`

### Endpoints actuales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio, timestamp y versión |

## Convenciones

- Los controladores REST se ubican en `com.hotclick.app.controller` y usan `@RestController` con `@RequestMapping("/api")` como prefijo de ruta.
