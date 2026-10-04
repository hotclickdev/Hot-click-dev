# Rutas solicitadas al supervisor

Una línea por ruta: agente, ruta, componente, guard. `AppRoutes.tsx` lo integra solo SUP.

| Agente | Ruta | Componente | Guard | Nota |
| --- | --- | --- | --- | --- |
| SYS | `/sin-conexion` | `pages/SinConexionPage` (lazy) | ninguno | **Integrada en `AppRoutes` por SHELL (1-oct-2026).** Pantalla de Figma `45:2264`. Pública. Dentro de `MainLayout variante="propia"`; la franja superior es global (`AvisoSinConexion`). Sirve de destino para el aviso de la PWA y para enlazar desde estados de error |
