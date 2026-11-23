# Llevar negocios existentes al flujo por fases (decisión de Andrés, NO se hace sola)

Al desplegar V244/V245 **no cambia nada** para los negocios que ya existen: quedan `alta_por_fases = FALSE` y
`venta_online_habilitada = TRUE`, publicados y cobrando como hoy. Los scripts de abajo son opcionales, se corren a mano
y **despublican / cambian dinero**, por eso no están en Flyway. Hacer respaldo antes.

## 0. Migración automática detrás de flag (APAGADA por defecto)

`hotclick.alta-fases.migrar-existentes` (env `HOTCLICK_ALTA_FASES_MIGRAR_EXISTENTES`, **por defecto `false`**) es un flag
distinto del de negocios nuevos (`hotclick.alta-fases.enabled`). Con `migrar-existentes=false` nada cambia para los existentes
(el job no lee ni escribe). Para que actúe se necesitan **los dos en true**.

- Qué hace (`AltaFasesMigracionExistentesService`, corre dentro del poller de cuentas ONVO, con su ShedLock): toma lotes de
  `hotclick.alta-fases.migrar-lote` (100, máx. 500) negocios `ACTIVO`, `alta_por_fases=FALSE` y sin cuenta ONVO `ACTIVA`, y les
  pone `alta_por_fases=TRUE`, `venta_online_habilitada=FALSE`. Es idempotente: un negocio ya migrado deja de ser candidato.
- Efecto: **despublica** esos negocios hasta que su cuenta ONVO quede ACTIVA (el poller los rehabilita solo). Los que ya tienen
  cuenta ACTIVA no se tocan.
- Antes de encenderlo: correr el diagnóstico (§1), avisar a los dueños y respaldar. Para apagarlo de nuevo: flag en `false`
  (no revierte lo migrado; ver reversión en §2).
- Los scripts SQL de abajo siguen sirviendo para migrar solo ids elegidos o para revertir.

## 1. Diagnóstico (solo lectura)

```sql
SELECT e.id_empresa, COALESCE(e.nombre_comercial, e.nombre_empresa) AS negocio, e.estado_empresa,
       COALESCE(c.estado, 'SIN_CUENTA') AS cuenta_onvo
  FROM hot_click_empresa_tb e
  LEFT JOIN hot_click_empresa_cuenta_onvo_tb c ON c.fk_id_empresa = e.id_empresa
 WHERE e.estado_empresa = 'ACTIVO' AND e.alta_por_fases = FALSE
   AND COALESCE(c.estado, 'SIN_CUENTA') <> 'ACTIVA'
 ORDER BY e.id_empresa;
```

## 2. Llevar negocios elegidos al flujo nuevo (DESPUBLICA hasta que su cuenta ONVO quede ACTIVA)

Elegir los ids del paso 1. El negocio sigue ACTIVO y gestiona todo, pero no se muestra ni cobra en línea hasta que su
cuenta ONVO se active (el poller lo habilita solo). El dueño ve el panel de fases con el botón a ONVO.

```sql
UPDATE hot_click_empresa_tb
   SET alta_por_fases = TRUE, venta_online_habilitada = FALSE
 WHERE id_empresa IN (/* ids elegidos */)
   AND estado_empresa = 'ACTIVO' AND alta_por_fases = FALSE;
```

Para todos los que no tienen cuenta ACTIVA (más agresivo; avisar antes a los dueños):

```sql
UPDATE hot_click_empresa_tb e
   SET alta_por_fases = TRUE, venta_online_habilitada = FALSE
 WHERE e.estado_empresa = 'ACTIVO' AND e.alta_por_fases = FALSE
   AND NOT EXISTS (SELECT 1 FROM hot_click_empresa_cuenta_onvo_tb c
                    WHERE c.fk_id_empresa = e.id_empresa AND c.estado = 'ACTIVA');
```

Marcar un negocio por fases como ya aprobado: no hace falta; ya está `ACTIVO`. Al quedar su cuenta ACTIVA pasa a
«Publicada» sin pasar por revisión (el aviso de revisión solo aplica a `PENDIENTE_APROBACION`).

Revertir un negocio: `UPDATE hot_click_empresa_tb SET alta_por_fases = FALSE, venta_online_habilitada = TRUE WHERE id_empresa = :id;`

## 3. Pagos históricos a la plataforma (opcional)

V245 no marca pagos antiguos. Si se quiere que el «saldo por reintegrar» incluya cobros anteriores de negocios sin
subcuenta (todo cobro ONVO anterior a que el negocio tuviera cuenta ACTIVA cayó a la plataforma), correr este script.
Revisar primero con el `SELECT`; acota por fecha de corte (`:corte`, el día del deploy) y excluye lo ya devuelto al comprador.

```sql
-- Vista previa
SELECT ped.fk_id_empresa, p.moneda, COUNT(*) AS pagos, SUM(p.monto) AS monto
  FROM hot_click_pago_tb p
  JOIN hot_click_pedido_tb ped ON ped.id_pedido = p.fk_id_pedido
  LEFT JOIN hot_click_empresa_cuenta_onvo_tb c ON c.fk_id_empresa = ped.fk_id_empresa
 WHERE p.proveedor = 'ONVO' AND p.estado_pago = 'CAPTURADO' AND p.destino_dinero IS NULL
   AND ped.fk_id_empresa IS NOT NULL
   AND p.fecha_creacion < COALESCE(c.activada_en, :corte)
 GROUP BY ped.fk_id_empresa, p.moneda;

-- Aplicar
UPDATE hot_click_pago_tb p
   SET destino_dinero = 'PLATAFORMA', reintegro_estado = 'NO_REINTEGRADO'
  FROM hot_click_pedido_tb ped
  LEFT JOIN hot_click_empresa_cuenta_onvo_tb c ON c.fk_id_empresa = ped.fk_id_empresa
 WHERE ped.id_pedido = p.fk_id_pedido AND ped.fk_id_empresa IS NOT NULL
   AND p.proveedor = 'ONVO' AND p.estado_pago = 'CAPTURADO' AND p.destino_dinero IS NULL
   AND p.fecha_creacion < COALESCE(c.activada_en, :corte);
```

Ojo: los negocios que ya liquidan por el flujo de quincena/retiros ya recibieron ese dinero; marcarlos como
«por reintegrar» sería doble. Decidir con finanzas antes de correr este paso.
