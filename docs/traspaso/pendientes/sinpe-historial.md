# Número SINPE y titular de HotClick en el historial público (copia)

Fuente: `/workspace/infra/SINPE-HISTORIAL-2026-10-17.md` (DevOps y Seguridad). El original no tiene el número, a propósito, y esta copia tampoco. Se quitó la referencia exacta al commit con el token viejo de Telegram.


Fecha: 17-oct-2026 (hora de Costa Rica). Autor: DevOps y Seguridad. Solo documento: no se ejecutó nada.
Este archivo no contiene el número a propósito.

## Situación
- El repo `hotclickdev/Hot-click-dev` es PÚBLICO.
- La pantalla vieja de SINPE (fuera de ONVO) muestra el número y el titular de HotClick cuando no hay token de ONVO. El hotfix del front está pendiente (rama local `fix/fe-sinpe-fuera-onvo`, frenada por presupuesto).
- Aunque el hotfix saque el número del código, sigue en todos los commits anteriores, en los forks, en las copias locales y en los mirrors o cachés que ya lo hayan indexado.
- Un número SINPE no es una credencial: no sirve para sacar plata. El riesgo es que alguien pague a HotClick por fuera de ONVO (sin conciliación automática), o que alguien use el número y el nombre del titular para hacerse pasar por HotClick y pedir pagos.

## Opciones

### A. Dejar el historial como está y sacar el número del código (hotfix)
- Qué es: salir con el hotfix del front, revisar que la API no lo devuelva y no hacer nada más.
- A favor: no cuesta nada, no rompe nada y respeta la regla de no reescribir ramas publicadas.
- Riesgos: el número sigue a la vista para quien busque en el historial. Si alguien ya lo copió, no hay vuelta atrás.

### B. Cambiar el número SINPE o la cuenta de cobro
- Qué es: el dueño da de baja o deja de usar ese número para cobros de HotClick, y desde ahora todo cobro entra solo por ONVO.
- A favor: es la única forma de que el número expuesto deje de servir, haya quien haya hecho la copia. Encaja con la regla de que SINPE va solo dentro de ONVO.
- Riesgos: es un trámite con el banco y puede afectar a clientes o proveedores que ya usen ese número. Si es el número personal del dueño, cambiarlo tiene un costo personal. Durante el cambio hay que avisar por los canales oficiales que el único medio de pago es la pasarela.

### C. Reescribir el historial (git filter-repo o BFG, más force push)
- Qué es: borrar el número de todos los commits y forzar el push de master y de las ramas.
- Riesgos (altos):
  - Choca con la regla vigente: «nunca force push ni rebase de ramas publicadas». Solo el dueño puede hacer la excepción.
  - Cambia el SHA de todos los commits: rompe todas las PR abiertas (#155, #176, #193–#213…), los worktrees de los bots, los tags de rollback (`rollback-pre-*`), el deploy del servidor (que hace `git pull`) y las referencias en SonarCloud.
  - No borra las copias que ya existen: forks, clones, refs de PR en GitHub (`refs/pull/*`, que solo GitHub Support puede purgar) y cachés de buscadores.
  - Lleva horas de coordinación con todos los bots en pausa y una ventana sin deploys.
- Cuándo tendría sentido: solo si se combina con B o con D y el dueño acepta el costo. Sola no resuelve la exposición.

### D. Hacer el repo privado
- Qué es: pasar `hotclickdev/Hot-click-dev` a privado en la configuración de GitHub.
- A favor: corta la exposición desde ahora, también para otras cosas sensibles que quedaron en el historial (por ejemplo un token viejo de Telegram, ya anotado para rotar).
- Riesgos: no borra las copias que ya existen. Puede cambiar costos o límites: minutos de GitHub Actions (en repos privados se cobran pasado el cupo gratis), el plan de SonarCloud (gratis solo para repos públicos) y algunos escáneres. Hay que revisar que los bots y el servidor sigan teniendo acceso con su token.

## Recomendación de DevOps y Seguridad (decide el dueño)
1. Ya: salir con el hotfix de SINPE (front y API) apenas haya presupuesto.
2. Decisión principal: B, si el número todavía se usa para cobrar. Si el dueño prefiere no cambiarlo, A, asumiendo el riesgo.
3. Evaluar D aparte, por todo lo que expone el repo público, revisando antes los costos de Actions y SonarCloud.
4. No recomiendo C: rompe mucho y no borra las copias que ya existen.

## Qué tiene que contestar el dueño
- ¿Ese número se sigue usando para recibir pagos? ¿Es personal o de la empresa?
- ¿Cambia el número (B) o asume el riesgo (A)?
- ¿Quiere que se evalúe pasar el repo a privado (D)?
