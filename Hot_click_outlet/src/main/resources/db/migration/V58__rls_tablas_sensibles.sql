-- ============================================================
-- V58: Row Level Security en tablas con datos sensibles
--
-- Cada bloque verifica que la tabla exista antes de aplicar RLS
-- para que la migración no falle si alguna tabla no fue creada
-- en este entorno (eg. tablas opcionales de módulos no activados).
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hot_click_usuario_tb') THEN
    ALTER TABLE hot_click_usuario_tb ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_usuario_service_only ON hot_click_usuario_tb;
    CREATE POLICY rls_usuario_service_only ON hot_click_usuario_tb
      USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hot_click_pedido_tb') THEN
    ALTER TABLE hot_click_pedido_tb ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_pedido_service_only ON hot_click_pedido_tb;
    CREATE POLICY rls_pedido_service_only ON hot_click_pedido_tb
      USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hot_click_comprobante_sinpe_tb') THEN
    ALTER TABLE hot_click_comprobante_sinpe_tb ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_comprobante_service_only ON hot_click_comprobante_sinpe_tb;
    CREATE POLICY rls_comprobante_service_only ON hot_click_comprobante_sinpe_tb
      USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hot_click_security_audit_log_tb') THEN
    ALTER TABLE hot_click_security_audit_log_tb ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_sec_audit_service_only ON hot_click_security_audit_log_tb;
    CREATE POLICY rls_sec_audit_service_only ON hot_click_security_audit_log_tb
      USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hot_click_security_alert_tb') THEN
    ALTER TABLE hot_click_security_alert_tb ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_sec_alert_service_only ON hot_click_security_alert_tb;
    CREATE POLICY rls_sec_alert_service_only ON hot_click_security_alert_tb
      USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hot_click_auditoria_admin_tb') THEN
    ALTER TABLE hot_click_auditoria_admin_tb ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_auditoria_service_only ON hot_click_auditoria_admin_tb;
    CREATE POLICY rls_auditoria_service_only ON hot_click_auditoria_admin_tb
      USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hot_click_refresh_token_tb') THEN
    ALTER TABLE hot_click_refresh_token_tb ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_refresh_token_service_only ON hot_click_refresh_token_tb;
    CREATE POLICY rls_refresh_token_service_only ON hot_click_refresh_token_tb
      USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hot_click_api_key_tb') THEN
    ALTER TABLE hot_click_api_key_tb ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_api_key_service_only ON hot_click_api_key_tb;
    CREATE POLICY rls_api_key_service_only ON hot_click_api_key_tb
      USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hot_click_billing_subscription_tb') THEN
    ALTER TABLE hot_click_billing_subscription_tb ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_billing_service_only ON hot_click_billing_subscription_tb;
    CREATE POLICY rls_billing_service_only ON hot_click_billing_subscription_tb
      USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hot_click_ai_copilot_history_tb') THEN
    ALTER TABLE hot_click_ai_copilot_history_tb ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_ai_history_service_only ON hot_click_ai_copilot_history_tb;
    CREATE POLICY rls_ai_history_service_only ON hot_click_ai_copilot_history_tb
      USING (current_user = 'postgres' OR pg_has_role(current_user, 'service_role', 'MEMBER'));
  END IF;
END $$;
