-- ============================================================
-- V58: Row Level Security en tablas con datos sensibles
--
-- ESTRATEGIA:
--   • Spring Boot se conecta como service_role → bypass RLS automático
--     (no afecta a la aplicación).
--   • anon / authenticated (Supabase SDK, dashboard, SQL editor con
--     clave pública) quedan BLOQUEADOS por defecto al activar RLS sin
--     políticas permisivas para esos roles.
--   • PgBouncer transaction mode: NO se usa set_config() ni session vars.
--     Las políticas se basan únicamente en el rol PostgreSQL (pg_roles).
-- ============================================================

-- ── Usuarios ────────────────────────────────────────────────
ALTER TABLE hot_click_usuario_tb ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede operar (ya tiene bypass, pero la política
-- explicita la intención y evita que roles futuros accedan por error).
CREATE POLICY rls_usuario_service_only
    ON hot_click_usuario_tb
    USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));

-- ── Pedidos ─────────────────────────────────────────────────
ALTER TABLE hot_click_pedido_tb ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_pedido_service_only
    ON hot_click_pedido_tb
    USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));

-- ── Comprobantes SINPE (datos bancarios del comprador) ───────
ALTER TABLE hot_click_comprobante_sinpe_tb ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_comprobante_service_only
    ON hot_click_comprobante_sinpe_tb
    USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));

-- ── Audit log de seguridad ───────────────────────────────────
ALTER TABLE hot_click_security_audit_log_tb ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_sec_audit_service_only
    ON hot_click_security_audit_log_tb
    USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));

-- ── Alertas de seguridad ─────────────────────────────────────
ALTER TABLE hot_click_security_alert_tb ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_sec_alert_service_only
    ON hot_click_security_alert_tb
    USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));

-- ── Auditoría de admins ───────────────────────────────────────
ALTER TABLE hot_click_auditoria_admin_tb ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_auditoria_service_only
    ON hot_click_auditoria_admin_tb
    USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));

-- ── Tokens de refresco ────────────────────────────────────────
ALTER TABLE hot_click_refresh_token_tb ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_refresh_token_service_only
    ON hot_click_refresh_token_tb
    USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));

-- ── API Keys ──────────────────────────────────────────────────
ALTER TABLE hot_click_api_key_tb ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_api_key_service_only
    ON hot_click_api_key_tb
    USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));

-- ── Datos de facturación / Stripe ────────────────────────────
ALTER TABLE hot_click_billing_subscription_tb ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_billing_service_only
    ON hot_click_billing_subscription_tb
    USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));

-- ── Historial de chat con IA (mensajes privados) ─────────────
ALTER TABLE hot_click_ai_copilot_history_tb ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_ai_history_service_only
    ON hot_click_ai_copilot_history_tb
    USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
