# Traspaso · Auditor 9 (front y UX)

- **Rol:** auditoría de solo lectura del front y la UX.
- **Evidencia:** [evidencia/auditor-9-front-ux/auditoria-front-ux-fb9ef78e.md](evidencia/auditor-9-front-ux/auditoria-front-ux-fb9ef78e.md)

Nota escrita por HotClick CI/CD en nombre del Auditor 9 (sin permiso de push).

## Correcciones al README

Hecho por Auditor 9 Front y UX sobre `docs/traspaso/README.md` en `b9f241d8`, en modo solo lectura.

### (a) Errores o datos viejos
- Fila del Auditor 9 (línea 139): la nota y la carpeta de evidencia existen en b9f241d8, pero no las escribió este bot, que no hizo push. El reemplazo debería revisar que coincidan con el informe real (10 correcciones y 6 mejoras).
- Estado del área 9 (línea 214): dice "C1 y C2 mergeados. 6 MEDIO en #334". La auditoría propia (`auditoria-front-ux-fb9ef78e.md`, sobre master fb9ef78e) reportó 10 correcciones (2 ALTO, 5 MEDIO, 3 BAJO) y 6 mejoras. No verifiqué si los C1 y C2 que nombra el README son los 2 ALTO de esa auditoría; conviene que el reemplazo lo cruce con #334.
- Sección del Auditor 9 (líneas 510 y siguientes): la escala de prioridades del perfil es "crítico, alto, medio o bajo", pero el formato que se acordó después es ALTO, MEDIO o BAJO, con dos listas (CORRECCIONES y MEJORAS). Conviene actualizar la descripción para que el reemplazo use ese formato.

### (b) Lo que le falta al reemplazo
- Dónde está la evidencia: `/workspace/hotclick-reportes/auditoria/auditoria-front-ux-fb9ef78e.md`, que está en el box; hay que confirmar que esté dentro de `docs/traspaso/evidencia/auditor-9-front-ux/`.
- Alcance pendiente: la revisión fue estática. Falta medir el tamaño del bundle, el contraste, los re-renders y el móvil a 360 px con el sitio corriendo. Comandos: `pnpm install && pnpm build` en el frontend y la inspección en el navegador local, nunca contra prod.
- Trampas:
  - En una cotización en USD, el subtotal de cada línea sale con ₡ y el valor capturado se divide entre 100 (`ItemRow.tsx:112`, `:35`, `:101-102` y `cotizacionService.ts:43`). Falta confirmar con backend la unidad.
  - Hay unas 22 funciones `fmt` locales para formatear montos.
  - Los textos mezclan usted y tú, y la regla es voseo.
- Accesos: solo lectura del repo. No hacen falta variables de entorno para auditar estáticamente.

### (c) Mejoras
- Agregar al README un helper único de montos (₡ y US$) como tarea transversal de Dev, y una verificación de voseo en CI (por ejemplo, un grep de "tienes", "intenta" y "usted" en `es.json`).
