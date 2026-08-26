---
name: campana-limpio-sonar
description: |
  Campaña de repo para aplicar las 4 reglas y Sonar juntos, un lote a la vez,
  sin olas que se pisen. Usar cuando el usuario pide 4 reglas y Sonar en todo
  el proyecto, “no se pisen”, siguiente lote, campaña de calidad, o limpiar
  el working tree mixto antes de tocar archivos nuevos.
---

# Campaña: 4 reglas + Sonar en el repo

El conflicto no es de reglas: es **dos olas** sobre los mismos archivos
(extraer → parche Sonar → extraer otra vez). En un archivo, leer
`codigo-limpio-sonar`. Lotes actuales: [reference.md](reference.md).

## Unidad

Un lote = N archivos tocados **una vez** con 4 reglas **y** Sonar (orden de
`codigo-limpio-sonar`). Commit. Siguiente lote.

Hecho = **no volver** salvo bug real o Quality Gate en código nuevo de ese
archivo.

## Cola (en este orden)

1. Working tree mixto (archivos ya sucios).
2. Bugs/vulns de **código nuevo** contrastados con el archivo local (`sonar-revisar`).
3. Banda ≥250 líneas del lote actual.
4. Banda ≥200 del lote actual.
5. Boy scout de smells **solo** en esos archivos.

## Prohibido

- Ola horizontal: “todas las funciones chicas del repo” y después “todo Sonar”.
- Re-extraer carpeta hermana ya partida (ver `reference.md`).
- Sprint de `S1192` / `S3358` / `S3776` sueltos (1036 smells no es un lote).
- Seguir sacando páginas nuevas si el WT sigue mixto.

## Zona sensible

Pago, auth, 2FA, POS, wizard producto, security: extract = **solo mover**,
hunk o commit distinto a bugs de gate.

## Verificar

- Java: `.\maven\bin\mvn test` del módulo tocado.
- Frontend: el texto UI que había sigue.
- Un commit por lote. Skills/meta aparte del código si el PR debe ser revisable.

Checklists: `.cursor/rules/codigo-limpio.mdc`, `sonar-prevenir`, `sonar-revisar`.
Atajo: `sonar-hotclick`.
