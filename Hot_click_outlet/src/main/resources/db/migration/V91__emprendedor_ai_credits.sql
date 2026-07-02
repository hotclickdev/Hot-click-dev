-- V91: Otorga créditos de IA limitados al plan EMPRENDEDOR (gratuito).
-- Antes tenía max_creditos_ai = 0 (V89) — el Copilot no era usable en el plan gratuito.
-- Decisión: darle acceso limitado por ahora; el día que se quiera reservar el
-- Copilot solo para planes pagos, basta con desactivar el feature flag
-- 'copilot_emprendedor' (V47) — AiQuotaService.resolverLimite() lo respeta
-- sin necesidad de un nuevo deploy.
UPDATE hot_click_plan_tb
SET max_creditos_ai = 10
WHERE nombre = 'EMPRENDEDOR';
