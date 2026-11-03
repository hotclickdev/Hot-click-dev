-- HotClick Fase 2 · semilla QA (SOLO STAGING) · NO EJECUTAR sin OK de Andrés (paso 0)
-- Idempotente: solo INSERT ... ON CONFLICT DO NOTHING. No hace UPDATE ni DELETE.
-- P2 (916e61f0): fk_id_estado = 1 (ACTIVO) explícito: V1__initial_schema.sql:27 lo declara NOT NULL DEFAULT 1, pero en
-- staging la tabla viene del dump legacy y el DEFAULT no está garantizado. Contadores en 0 explícitos por lo mismo.
-- Revisada contra adf05174: model/Usuario.java:12-135. NOT NULL sin valor acá (puntos_fidelidad, limite_credito,
-- saldo_credito, total_compras_hist, num_pedidos_hist) tienen DEFAULT 0 en Flyway. OK.
-- Ejecutar con: psql "$STAGING_URL" -v ON_ERROR_STOP=1 -v entorno=staging -f 01-cuentas-qa.sql
\set ON_ERROR_STOP on
\if :{?entorno}
\else
  \echo 'ABORTADO: falta -v entorno=staging'
  -- P6: error forzado para que psql salga con rc=3 (ON_ERROR_STOP), no rc=0 como con \quit
  SELECT 1/0 AS falta_entorno;
\endif
-- Guardia 1: variable explícita
SELECT CASE WHEN :'entorno' = 'staging' THEN 1 ELSE 1/0 END AS guardia_entorno;
BEGIN;
DO $$
DECLARE db text := current_database(); n_reales bigint;
BEGIN
  -- Guardia 2: nombre de BD debe contener "staging" y no "prod"
  IF db !~* 'staging' OR db ~* 'prod' THEN
    RAISE EXCEPTION 'ABORTADO: BD "%" no parece staging', db;
  END IF;
  -- Guardia 3: si hay muchos usuarios no-QA, huele a producción
  SELECT count(*) INTO n_reales FROM hot_click_usuario_tb WHERE correo NOT LIKE '%@ejemplo.test';
  IF n_reales > 50 THEN
    RAISE EXCEPTION 'ABORTADO: % usuarios no ficticios, posible producción', n_reales;
  END IF;
END $$;

INSERT INTO hot_click_usuario_tb
  (identificacion, nombre, apellido_paterno, apellido_materno, correo, telefono,
   contrasena_hash, fecha_registro, intentos_fallidos, correo_verificado, two_factor_enabled,
   fk_id_estado, puntos_fidelidad, limite_credito, saldo_credito, total_compras_hist, num_pedidos_hist)
VALUES
 ('QA-000000001','Ana','Prueba','Uno','qa+cliente@ejemplo.test','0000-0001','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000002','Beto','Prueba','Dos','qa+consumidor@ejemplo.test','0000-0002','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000003','Carla','Prueba','Tres','qa+emprendedor@ejemplo.test','0000-0003','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000004','Diego','Prueba','Cuatro','qa+pyme-dueno@ejemplo.test','0000-0004','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000005','Elena','Prueba','Cinco','qa+pyme-admin@ejemplo.test','0000-0005','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000006','Fabio','Prueba','Seis','qa+pyme-editor@ejemplo.test','0000-0006','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000007','Gina','Prueba','Siete','qa+pyme-lector@ejemplo.test','0000-0007','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000008','Hugo','Prueba','Ocho','qa+plus-dueno@ejemplo.test','0000-0008','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000009','Irene','Prueba','Nueve','qa+plus-admin@ejemplo.test','0000-0009','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000010','Jorge','Prueba','Diez','qa+cajero@ejemplo.test','0000-0010','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000011','Karla','Prueba','Once','qa+cajero-b@ejemplo.test','0000-0011','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000012','Luis','Prueba','Doce','qa+admin@ejemplo.test','0000-0012','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000013','Marta','Prueba','Trece','qa+soporte-tg@ejemplo.test','0000-0013','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000014','Nico','Prueba','Catorce','qa+gracia@ejemplo.test','0000-0014','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000015','Olga','Prueba','Quince','qa+impago@ejemplo.test','0000-0015','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000016','Pablo','Prueba','Dieciseis','qa+vencida@ejemplo.test','0000-0016','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000017','Rosa','Prueba','Diecisiete','qa+upgrade@ejemplo.test','0000-0017','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0),
 ('QA-000000018','Saul','Prueba','Dieciocho','qa+downgrade@ejemplo.test','0000-0018','!QA-SIN-CLAVE-USAR-RECUPERACION',now(),0,true,false,1,0,0,0,0,0)
ON CONFLICT DO NOTHING;

-- Tiendas, equipo, planes, suscripciones y productos: 02-tiendas-productos.sql.
COMMIT;
