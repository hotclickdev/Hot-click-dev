-- HotClick Fase 2 · semilla QA 02 (SOLO STAGING) · NO EJECUTAR sin el paso 0
-- Verificada contra el esquema de master adf05174 y 916e61f0 (entidades model/*.java + Flyway).
-- Todas las columnas NOT NULL llevan valor explícito (23 que en Flyway solo tienen DEFAULT: V1, V17, V30, V85, V96,
-- V136, V158, V168, V173, V180, V181, V204), para no depender de DEFAULT ni de Flyway (revalidación QA en PG17). Requiere 01-cuentas-qa.sql antes.
-- Solo INSERT idempotente (WHERE NOT EXISTS / ON CONFLICT DO NOTHING). Sin UPDATE ni DELETE.
-- psql "$STAGING_URL" -v ON_ERROR_STOP=1 -v entorno=staging -f 02-tiendas-productos.sql
\set ON_ERROR_STOP on
\if :{?entorno}
\else
  \echo 'ABORTADO: falta -v entorno=staging'
  -- P6: error forzado para que psql salga con rc=3 (ON_ERROR_STOP), no rc=0 como con \quit
  SELECT 1/0 AS falta_entorno;
\endif
SELECT CASE WHEN :'entorno' = 'staging' THEN 1 ELSE 1/0 END AS guardia_entorno;
BEGIN;
DO $$
DECLARE db text := current_database(); n bigint;
BEGIN
  IF db !~* 'staging' OR db ~* 'prod' THEN RAISE EXCEPTION 'ABORTADO: BD "%" no parece staging', db; END IF;
  SELECT count(*) INTO n FROM hot_click_usuario_tb WHERE correo NOT LIKE '%@ejemplo.test';
  IF n > 50 THEN RAISE EXCEPTION 'ABORTADO: % usuarios no ficticios, posible producción', n; END IF;
  SELECT count(*) INTO n FROM hot_click_usuario_tb WHERE correo LIKE 'qa+%@ejemplo.test';
  IF n < 18 THEN RAISE EXCEPTION 'ABORTADO: faltan cuentas QA (%/18); corré 01 primero', n; END IF;
  IF NOT EXISTS (SELECT 1 FROM hot_click_plan_tb WHERE nombre IN ('EMPRENDEDOR','PYME','NEGOCIO_PLUS') HAVING count(*)=3)
    THEN RAISE EXCEPTION 'ABORTADO: faltan planes EMPRENDEDOR/PYME/NEGOCIO_PLUS (Flyway V89)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM hot_click_categoria_tb) THEN RAISE EXCEPTION 'ABORTADO: sin categorías'; END IF;
END $$;

-- Usuario QA por clave
CREATE TEMP TABLE qa_u ON COMMIT DROP AS
SELECT split_part(split_part(correo,'+',2),'@',1) AS k, id_usuario AS id FROM hot_click_usuario_tb WHERE correo LIKE 'qa+%@ejemplo.test';

-- 1) Roles globales (hot_click_usuario_rol_tb). Planes NO se insertan: se usan los de Flyway.
--    fk_id_estado existe en Flyway (V1__initial_schema.sql:43) pero no en un esquema creado por Hibernate
--    (Usuario.java:143, @JoinTable sin esa columna): se detecta y, si no está, se omite del INSERT.
SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema()
               AND table_name = 'hot_click_usuario_rol_tb' AND column_name = 'fk_id_estado') AS ur_estado \gset
\if :ur_estado
  \set ur_cols 'fk_id_usuario, fk_id_rol, fk_id_estado'
  \set ur_val ', 1'
\else
  \echo 'AVISO: hot_click_usuario_rol_tb sin fk_id_estado; se omite del INSERT'
  \set ur_cols 'fk_id_usuario, fk_id_rol'
  \set ur_val ''
\endif
INSERT INTO hot_click_usuario_rol_tb (:ur_cols)
SELECT u.id, r.id_rol :ur_val FROM qa_u u JOIN hot_click_rol_tb r ON r.nombre_rol = CASE
   WHEN u.k = 'admin' THEN 'ADMIN' WHEN u.k = 'soporte-tg' THEN 'SUPPORT'
   WHEN u.k IN ('emprendedor','pyme-dueno','plus-dueno','gracia','impago','vencida','upgrade','downgrade') THEN 'EMPRENDEDOR' END
WHERE NOT EXISTS (SELECT 1 FROM hot_click_usuario_rol_tb x WHERE x.fk_id_usuario=u.id AND x.fk_id_rol=r.id_rol);

-- 2) Tiendas (hot_click_empresa_tb). slug y correo_empresa son únicos.
CREATE TEMP TABLE qa_t (slug text, nombre text, dueno text, plan text, estado_empresa text, estado_plan text, pausada boolean) ON COMMIT DROP;
INSERT INTO qa_t VALUES
 ('qa-emprendedor','QA Tienda Emprendedor','emprendedor','EMPRENDEDOR','ACTIVO','ACTIVO',false),
 ('qa-pyme-cafe','QA Pyme Café','pyme-dueno','PYME','ACTIVO','ACTIVO',false),
 ('qa-plus-ferreteria','QA Plus Ferretería','plus-dueno','NEGOCIO_PLUS','ACTIVO','ACTIVO',false),
 ('qa-tienda-b','QA Tienda B (IDOR)','plus-dueno','NEGOCIO_PLUS','ACTIVO','ACTIVO',false),
 ('qa-gracia','QA Tienda Gracia','gracia','EMPRENDEDOR','ACTIVO','PAST_DUE',false),
 ('qa-impago','QA Tienda Pausada','impago','PYME','SUSPENDIDO_IMPAGO','PAST_DUE',false),
 ('qa-vencida','QA Tienda Vencida','vencida','NEGOCIO_PLUS','ACTIVO','VENCIDO',false),
 ('qa-upgrade','QA Tienda Upgrade','upgrade','EMPRENDEDOR','ACTIVO','ACTIVO',false),
 ('qa-downgrade','QA Tienda Downgrade','downgrade','NEGOCIO_PLUS','ACTIVO','ACTIVO',false);
-- 2a) Emprendedor sin negocio en staging (2-nov): V8__saas_empresa_y_roles.sql:30-34 inserta HOTCLICK con
--     id_empresa=1 explícito y ninguna migración hace setval, así que la secuencia BIGSERIAL seguía en 1.
--     La primera fila (qa-emprendedor) sacó id 1, chocó con la PK y el ON CONFLICT DO NOTHING la descartó en silencio;
--     las otras 8 quedaron en 2..9. Aquí solo se consume nextval() hasta pasar el máximo (sin setval, UPDATE ni DELETE).
DO $$
DECLARE r record; s text; v bigint; mx bigint; i int;
BEGIN
  FOR r IN SELECT * FROM (VALUES ('hot_click_empresa_tb','id_empresa'),('hot_click_miembro_empresa_tb','id_miembro'),
      ('hot_click_suscripcion_tb','id_suscripcion'),('hot_click_bodega_tb','id_bodega'),('hot_click_producto_tb','id_producto')) t(tb, col)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema()
                   AND table_name = r.tb AND column_name = r.col) THEN CONTINUE; END IF;
    s := pg_get_serial_sequence(r.tb, r.col);
    IF s IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT coalesce(max(%I),0) FROM %I', r.col, r.tb) INTO mx;
    i := 0;
    LOOP
      EXECUTE format('SELECT last_value + CASE WHEN is_called THEN 1 ELSE 0 END FROM %s', s) INTO v;
      EXIT WHEN v > mx;
      PERFORM nextval(s); i := i + 1;
      IF i > 100000 THEN RAISE EXCEPTION 'ABORTADO: secuencia % muy atrás de max(%)=%', s, r.col, mx; END IF;
    END LOOP;
    IF i > 0 THEN RAISE NOTICE 'AVISO: % avanzada % valores (max %)', s, i, mx; END IF;
  END LOOP;
END $$;
INSERT INTO hot_click_empresa_tb (nombre_empresa, slug, correo_empresa, telefono_empresa, moneda_defecto, pais_operacion,
  plan_saas, estado_empresa, fk_id_plan, estado_plan, fecha_registro, fecha_aprobacion, descripcion,
  fk_id_estado, visibilidad_publica, inscrito_hacienda, pct_comision_tarjeta, monto_fijo_comision_crc, pct_descuento_sinpe,
  dia_cobro, frecuencia_payout, destacado, cobros_pausados, tienda_pausada, regimen_iva)
SELECT t.nombre, t.slug, t.slug||'@ejemplo.test', '0000-0099', 'CRC', 'CRI', t.plan, t.estado_empresa,
       p.id_plan, t.estado_plan, now(), now(), 'Tienda ficticia QA Fase 2 (staging)',
       1, true, false, 4.80, 200, 0, 28, 'QUINCENAL', false, false, t.pausada, 'SIMPLIFICADO'
FROM qa_t t JOIN hot_click_plan_tb p ON p.nombre = t.plan
ON CONFLICT DO NOTHING;
CREATE TEMP TABLE qa_e ON COMMIT DROP AS
SELECT t.*, e.id_empresa AS id FROM qa_t t JOIN hot_click_empresa_tb e ON e.slug = t.slug;
DO $$ BEGIN
  IF (SELECT count(*) FROM qa_e) <> 9 THEN
    RAISE EXCEPTION 'ABORTADO: faltan tiendas QA (%/9): %', (SELECT count(*) FROM qa_e),
      (SELECT string_agg(slug, ',') FROM qa_t WHERE slug NOT IN (SELECT slug FROM qa_e));
  END IF;
END $$;

-- 3) Equipo (hot_click_miembro_empresa_tb, único usuario+empresa). PROPIETARIO = dueño (PropietarioGuard).
INSERT INTO hot_click_miembro_empresa_tb (fk_id_usuario, fk_id_empresa, rol_en_empresa, estado, fecha_ingreso)
SELECT u.id, e.id, m.rol, 1, now() FROM (VALUES
 ('emprendedor','qa-emprendedor','PROPIETARIO'),('pyme-dueno','qa-pyme-cafe','PROPIETARIO'),
 ('pyme-admin','qa-pyme-cafe','ADMIN'),('pyme-editor','qa-pyme-cafe','EDITOR'),('pyme-lector','qa-pyme-cafe','LECTOR'),
 ('plus-dueno','qa-plus-ferreteria','PROPIETARIO'),('plus-dueno','qa-tienda-b','PROPIETARIO'),
 ('plus-admin','qa-plus-ferreteria','ADMIN'),('cajero','qa-plus-ferreteria','CAJERO'),('cajero-b','qa-tienda-b','CAJERO'),
 ('gracia','qa-gracia','PROPIETARIO'),('impago','qa-impago','PROPIETARIO'),('vencida','qa-vencida','PROPIETARIO'),
 ('upgrade','qa-upgrade','PROPIETARIO'),('downgrade','qa-downgrade','PROPIETARIO')) m(uk, slug, rol)
JOIN qa_u u ON u.k = m.uk JOIN qa_e e ON e.slug = m.slug
ON CONFLICT DO NOTHING;

-- 3b) P1: rol global EMPRENDEDOR también para ADMIN, EDITOR, LECTOR y CAJERO, igual que la app al invitar
--     (EquipoService.java:59 y :116 en 916e61f0). Sin esto, /api/productos/admin/todos y /api/empresa/perfil dan 403.
INSERT INTO hot_click_usuario_rol_tb (:ur_cols)
SELECT DISTINCT m.fk_id_usuario, r.id_rol :ur_val
FROM hot_click_miembro_empresa_tb m
JOIN hot_click_usuario_tb u ON u.id_usuario = m.fk_id_usuario AND u.correo LIKE 'qa+%@ejemplo.test'
JOIN hot_click_rol_tb r ON r.nombre_rol = 'EMPRENDEDOR'
WHERE m.rol_en_empresa <> 'PROPIETARIO'
  -- P4: sin PK (fk_id_usuario, fk_id_rol) el ON CONFLICT no evita duplicados; NOT EXISTS sí
  AND NOT EXISTS (SELECT 1 FROM hot_click_usuario_rol_tb x WHERE x.fk_id_usuario = m.fk_id_usuario AND x.fk_id_rol = r.id_rol)
ON CONFLICT DO NOTHING;

-- 4) Suscripciones (hot_click_suscripcion_tb). Gracia = hotclick.billing.dias-gracia=8 (application.properties:549).
INSERT INTO hot_click_suscripcion_tb (fk_id_empresa, fk_id_plan, estado, fecha_inicio, fecha_fin, cancelar_al_vencer, fecha_creacion, fecha_actualizacion)
SELECT e.id, p.id_plan, s.estado, s.ini, s.fin, false, now(), now() FROM (VALUES
 ('qa-pyme-cafe','ACTIVO', CURRENT_DATE-10, CURRENT_DATE+20),
 ('qa-plus-ferreteria','ACTIVO', CURRENT_DATE-10, CURRENT_DATE+20),
 ('qa-downgrade','ACTIVO', CURRENT_DATE-10, CURRENT_DATE+20),
 ('qa-gracia','PAST_DUE', CURRENT_DATE-33, CURRENT_DATE-3),   -- día 3 de 8: sigue vendiendo
 ('qa-impago','PAST_DUE', CURRENT_DATE-39, CURRENT_DATE-9),   -- día 9: SUSPENDIDO_IMPAGO
 ('qa-vencida','VENCIDO', CURRENT_DATE-60, CURRENT_DATE-30)) s(slug, estado, ini, fin)
JOIN qa_e e ON e.slug = s.slug JOIN hot_click_plan_tb p ON p.nombre = e.plan
WHERE NOT EXISTS (SELECT 1 FROM hot_click_suscripcion_tb x WHERE x.fk_id_empresa = e.id);

-- 5) Bodegas (hot_click_bodega_tb). Pyme Café y Downgrade con dos bodegas.
INSERT INTO hot_click_bodega_tb (nombre_bodega, direccion_exacta, telefono, provincia, canton, distrito, fk_id_admin_cliente, fk_id_empresa, fecha_creacion,
  fk_id_estado, permite_retiro_cliente, acepta_efectivo)
SELECT b.nombre, 'Calle QA ficticia 0', '0000-0099', 'San José', 'San José', 'Carmen', u.id, e.id, now(), 1, false, false
FROM qa_e e JOIN qa_u u ON u.k = e.dueno
CROSS JOIN LATERAL (VALUES ('QA Central'), ('QA Norte')) b(nombre)
WHERE (b.nombre = 'QA Central' OR e.slug IN ('qa-pyme-cafe','qa-plus-ferreteria','qa-downgrade'))
  AND NOT EXISTS (SELECT 1 FROM hot_click_bodega_tb x WHERE x.fk_id_empresa = e.id AND x.nombre_bodega = b.nombre);

-- 6) Productos (hot_click_producto_tb). Montos en colones enteros; IVA lo calcula el servidor.
INSERT INTO hot_click_producto_tb (nombre_producto, precio_compra, precio_venta, stock_actual, sku,
  fk_id_bodega, fk_id_categoria, fk_id_admin_cliente, fk_id_empresa, en_oferta, precio_oferta, es_personalizado, fecha_creacion,
  fk_id_estado, stock_minimo, es_unico, vendido, destacado, visible_catalogo, en_carrusel, version)
SELECT p.nombre, p.costo, p.precio, p.stock, p.sku, b.id_bodega,
       (SELECT min(id_categoria) FROM hot_click_categoria_tb), u.id, e.id, p.oferta IS NOT NULL, p.oferta, p.pers, now(),
       1, 5, false, false, false, true, false, 0
FROM (VALUES
 ('QA-001','Taza QA cerámica','qa-emprendedor','QA Central',2000,4500,10,NULL::int,false),
 ('QA-002','Camiseta QA talla M','qa-emprendedor','QA Central',4000,8900,1,NULL,false),
 ('QA-003','Café QA 340 g','qa-pyme-cafe','QA Central',3000,6250,20,NULL,false),
 ('QA-003N','Café QA 340 g (Norte, sin stock)','qa-pyme-cafe','QA Norte',3000,6250,0,NULL,false),
 ('QA-004','Queque QA personalizado','qa-pyme-cafe','QA Central',7000,15000,5,NULL,true),
 ('QA-005','Martillo QA','qa-plus-ferreteria','QA Central',6000,12300,8,9900,false),
 ('QA-006','Tornillos QA x100','qa-plus-ferreteria','QA Central',500,1250,500,NULL,false),
 ('QA-007','Producto QA tienda B','qa-tienda-b','QA Central',1500,3000,3,NULL,false),
 ('QA-008','Producto QA pausado','qa-impago','QA Central',1000,2000,5,NULL,false),
 ('QA-009','Producto QA gracia','qa-gracia','QA Central',1000,2500,5,NULL,false),
 ('QA-010','Producto QA vencida','qa-vencida','QA Central',1000,2500,5,NULL,false)
) p(sku, nombre, slug, bodega, costo, precio, stock, oferta, pers)
JOIN qa_e e ON e.slug = p.slug JOIN qa_u u ON u.k = e.dueno
JOIN hot_click_bodega_tb b ON b.fk_id_empresa = e.id AND b.nombre_bodega = p.bodega
WHERE NOT EXISTS (SELECT 1 FROM hot_click_producto_tb x WHERE x.fk_id_empresa = e.id AND x.sku = p.sku);
COMMIT;
