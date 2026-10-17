# Desarrollador Frontend: pendientes

Se quedó sin presupuesto el 16-oct a las 11:11 pm CR. No dejó informe propio; esto sale del chat del equipo y de GitHub.

- **Hotfix SINPE:** la rama local `fix/fe-sinpe-fuera-onvo` quedó vacía cuando Frontend paró. **Se reasignó al Desarrollador**, que la está trabajando ahora (a las 2:19 am CR ya tenía un commit de `static/`). Alcance:
  1. sacar el número y el titular de la pantalla sin token de ONVO, con el texto «Pago SINPE disponible pronto dentro de la pasarela segura» y sin pedir comprobantes;
  2. ocultar el QR SINPE en el POS (QA-NEG-056);
  3. mostrar con `rg` que no queda nada en `static/`, `src` ni i18n.
- **#213** (`fe-registro-frecuencia`, cabeza `4f6faaf17`, draft):
  - Manda `frecuenciaLiquidacion` en las altas.
  - **Falta:** en la tienda rápida, mover la elección de frecuencia del formulario del admin a la página del enlace del negocio (regla del dueño: el negocio elige al registrarse).
  - Sale en un solo build con #197.
- **PRs de Frontend que esperan el rebuild de `static/`:** #168, #170, #171, #172, #174, #179, #180 y #181. Ver también #164 a #167, #169, #173, #182, #183, #185 a #192, #204, #205, #210 y #212 en la tabla de PRs abiertos del traspaso.
- **Contratos de API:** muchos PRs del front usan un «contrato supuesto». Antes de cerrarlos, compararlos con `docs/contratos/` (Backend) y con la lista de pedidos del front. Esa lista está en la máquina compartida: `contratos-front-para-backend.md`.
- Al terminar, cerrar los procesos de vite y node.
