# Notas de compatibilidad y build linux/arm64

Fecha de la verificación: 2026-11-23. Ejecutada desde un box x86_64 Debian 13 (sandbox), no desde la VM Oracle (aún no existe).

## 1. Compatibilidad ARM64 (verificada contra el registro de Docker Hub, manifest list)

| Imagen / paquete | arm64 |
| --- | --- |
| `maven:3.9-eclipse-temurin-21` (stage builder) | ✅ |
| `eclipse-temurin:21-jre-alpine` (runtime) | ✅ |
| `postgres:18-alpine` (compose) | ✅ |
| `chromium` + `chromium-chromedriver` (apk Alpine) | ✅ — durante el build arm64 `apk add` resolvió e instaló 215 paquetes, incluido `chromium 158.0.8127.36-r0` |

**Conclusión:** `Hot_click_outlet/Dockerfile` no necesita cambios para arm64; no hace falta pasar a Debian/Ubuntu. El jar es Java puro (se compila en el builder de la misma plataforma). No se encontró ninguna incompatibilidad de ARM en los FROM ni en los paquetes apk. No se auditaron dependencias nativas dentro del jar (no se pudo compilar, ver abajo); si alguna librería trae binarios nativos solo x86, aparecería al arrancar la app en la VM.

## 2. Build intentado — resultado: **NO completado (falla por la red del sandbox, no por ARM)**

Qué se hizo:
1. Instalé `docker.io`, `docker-cli`, `docker-buildx` y `qemu-user-static` con apt (sin publicar puertos; `dockerd` con `--iptables=false --bridge=none`, así no tocó 5432/8081/3000).
2. Monté `binfmt_misc` y registré `qemu-aarch64`. Comprobación: `docker run --platform linux/arm64 alpine uname -m` → `aarch64` ✅ (la emulación funciona).
3. `BUILD_NETWORK=host deploy/oracle/build-arm64.sh` (`docker buildx build --platform linux/arm64 --load`, context `Hot_click_outlet`).

Resultado: el stage runtime avanzó (apk + chromium arm64 OK). El stage builder falló en
`mvn dependency:resolve` con
`Could not transfer artifact ...spring-boot-starter-parent:pom:3.5.16 from central: Unsupported or unrecognized SSL message`.
Causa: el contenedor de build sale a internet por el proxy/túnel de egreso del sandbox (el host sí llega a Maven Central, HTTP 200 por `curl`, pero la JVM dentro del contenedor no confía en/no atraviesa ese túnel). Es una limitación del entorno de prueba, **no** del Dockerfile ni de ARM.

**No hay imagen arm64 construida y no se afirma que el build funcione.** Además, aun sin ese problema, compilar Maven bajo emulación QEMU en x86 es lento (estimado decenas de minutos).

## 3. Cómo construir de verdad
- **En la VM Oracle (aarch64):** `deploy/oracle/build-arm64.sh` — build nativo, sin emulación. Es la vía recomendada.
- Desde un x86 con internet normal: instalar `qemu-user-static` + binfmt y correr el mismo script (opcional `--tar imagen.tar` y `scp` a la VM, luego `docker load -i`).
- Alternativa más rápida si hiciera falta construir en x86: compilar el jar en el stage builder con `--platform=$BUILDPLATFORM` (el jar no depende de la arquitectura) y dejar arm64 solo para el runtime. No se aplicó: implicaría cambiar el Dockerfile compartido con producción.

## 4. Estado que dejó la prueba en el box
Paquetes docker/qemu quedan instalados; `dockerd` detenido por PID; `qemu-aarch64` de binfmt desregistrado (el mount de `binfmt_misc` queda). Imagen `alpine:3.20` en el almacén local de Docker. No se tocó ningún proceso QA.
