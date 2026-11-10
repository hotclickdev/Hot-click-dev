## Cadena de bloqueos 2026-10-26 12:43:40 CR
 pid  | bloqueado_por |        state        |          xact_cr           |                                   q                                    
------+---------------+---------------------+----------------------------+------------------------------------------------------------------------
 5383 | {}            | idle in transaction | 2026-10-26 12:37:08.60323  | select p1_0.id_pago,p1_0.fk_id_compra,p1_0.fk_id_estado,p1_0.estado_pa
 5382 | {5383}        | active              | 2026-10-26 12:37:10.073791 | select p1_0.id_producto,p1_0.fk_id_admin_cliente,p1_0.barcode,p1_0.fk_
 5386 | {5382}        | active              | 2026-10-26 12:42:09.344514 | select p1_0.id_pago,p1_0.fk_id_compra,p1_0.fk_id_estado,p1_0.estado_pa
 5387 | {}            | idle in transaction | 2026-10-26 12:42:08.369002 | select p1_0.id_pago,p1_0.fk_id_compra,p1_0.fk_id_estado,p1_0.estado_pa
 5384 | {5382}        | active              | 2026-10-26 12:38:38.415423 | select p1_0.id_producto,p1_0.fk_id_admin_cliente,p1_0.barcode,p1_0.fk_
(5 rows)

 pid  | locktype |       mode       | granted |        relname        
------+----------+------------------+---------+-----------------------
 5382 | relation | RowExclusiveLock | t       | hot_click_pago_tb
 5382 | relation | RowExclusiveLock | t       | hot_click_pedido_tb
 5382 | relation | RowShareLock     | t       | hot_click_producto_tb
 5382 | relation | RowShareLock     | t       | hot_click_pago_tb
 5383 | relation | RowExclusiveLock | t       | hot_click_pedido_tb
 5383 | relation | RowShareLock     | t       | hot_click_producto_tb
 5383 | relation | RowExclusiveLock | t       | hot_click_producto_tb
 5383 | relation | RowExclusiveLock | t       | hot_click_pago_tb
 5384 | relation | RowShareLock     | t       | hot_click_producto_tb
 5386 | relation | RowShareLock     | t       | hot_click_pago_tb
(10 rows)

 id_pago | fk_id_pedido | estado_pago | proveedor |                 fecha_creacion       
---------+--------------+-------------+-----------+----------------------------------+----------------------------
      11 |           13 | PENDIENTE   | ONVO      | <sesion_test> | 2026-10-26 04:34:29.197083
      12 |           14 | PENDIENTE   | ONVO      | <sesion_test> | 2026-10-26 04:35:19.518459
      13 |           15 | PENDIENTE   | ONVO      | <sesion_test> | 2026-10-26 04:37:05.776419
(3 rows)

## Workaround local (solo hotclick_qa5_b456) 2026-10-26 12:44:13 CR: backend run1 matado con -9; pagos 11-13 fecha_creacion=now() para que el cleanup no los tome en esta sesión
UPDATE 3
 id_pedido | estado_pedido 
-----------+---------------
        13 | PENDIENTE
        14 | PENDIENTE
        15 | PENDIENTE
(3 rows)

 id_producto | stock_actual | stock_reservado 
-------------+--------------+-----------------
           3 |           10 |               0
           2 |            5 |               3
(2 rows)

