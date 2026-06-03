-- V50: Índices de escala para consultas de alto volumen por tenant
-- CONCURRENTLY omitido: Flyway community ejecuta en transacción y PostgreSQL
-- no permite CONCURRENTLY dentro de una TX. Con el volumen actual la creación
-- es instantánea. Agregar CONCURRENTLY manualmente en producción si la tabla
-- supera 1M filas y se requiere zero-downtime.

-- Catálogo por tenant: filtro más frecuente (empresa + activo)
-- ProductoRepository: WHERE fk_id_empresa = ? AND fk_id_estado = 1
CREATE INDEX IF NOT EXISTS idx_producto_empresa_estado
    ON hot_click_producto_tb (fk_id_empresa, fk_id_estado)
    WHERE fk_id_estado = 1;

-- Stock bajo por tenant: DashboardService + alertas de inventario
CREATE INDEX IF NOT EXISTS idx_producto_empresa_stock
    ON hot_click_producto_tb (fk_id_empresa, stock_actual)
    WHERE fk_id_estado = 1;

-- Usuarios por tenant: CRM, admin panel, SolicitudAprobacion
-- UsuarioRepository: WHERE fk_id_empresa = ? AND fk_id_estado = 1
CREATE INDEX IF NOT EXISTS idx_usuario_empresa_estado
    ON hot_click_usuario_tb (fk_id_empresa, fk_id_estado);

-- Empresas activas: schedulers ABC, Forecast, BillingRenewal
-- EmpresaRepository.findByEstadoEmpresa(...)
CREATE INDEX IF NOT EXISTS idx_empresa_estado
    ON hot_click_empresa_tb (estado_empresa);
