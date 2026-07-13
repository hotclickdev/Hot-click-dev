-- ============================================================
-- V100: marketplace — publicar el catálogo de empresas aprobadas
--
-- Incidente 2026-07-12: aprobar una empresa seteaba estado_empresa='ACTIVO'
-- pero nunca restauraba visibilidad_publica (el registro la fuerza a FALSE).
-- Resultado: los productos de todos los emprendedores aprobados quedaron
-- fuera del catálogo público (/api/productos solo mostraba empresa 1).
--
-- Repara los datos existentes. Idempotente: los WHERE excluyen filas ya
-- correctas. El ORDEN importa: primero productos (usa visibilidad_publica
-- = FALSE para identificar a las empresas afectadas por el bug y no tocar
-- productos ocultados a propósito por el admin de la empresa 1), después
-- empresas, después solicitudes.
-- ============================================================

-- 1) Publicar productos activos de empresas ACTIVO que el bug dejó invisibles
--    (visibilidad_publica=FALSE). No toca productos de empresas ya visibles
--    (p. ej. los que HOTCLICK oculta a propósito) ni archivados/vendidos.
UPDATE hot_click_producto_tb p
   SET visible_catalogo = TRUE
  FROM hot_click_empresa_tb e
 WHERE p.fk_id_empresa = e.id_empresa
   AND e.estado_empresa = 'ACTIVO'
   AND e.visibilidad_publica = FALSE
   AND p.fk_id_estado = 1
   AND p.visible_catalogo = FALSE;

-- 2) Empresa aprobada = visible al público
UPDATE hot_click_empresa_tb
   SET visibilidad_publica = TRUE
 WHERE estado_empresa = 'ACTIVO'
   AND visibilidad_publica = FALSE;

-- 3) Cerrar solicitudes de producto pendientes: la aprobación por producto se
--    eliminó — publica la aprobación de la empresa (EmpresaAprobacionService).
UPDATE hot_click_solicitud_aprobacion_tb s
   SET estado_solicitud = 'APROBADO',
       fecha_resolucion = NOW(),
       comentario_revisor = 'Auto-aprobada en V100: la publicación ahora la controla la aprobación de la empresa'
  FROM hot_click_empresa_tb e
 WHERE s.fk_id_empresa = e.id_empresa
   AND s.tipo_entidad = 'PRODUCTO'
   AND s.estado_solicitud = 'PENDIENTE'
   AND e.estado_empresa = 'ACTIVO';
