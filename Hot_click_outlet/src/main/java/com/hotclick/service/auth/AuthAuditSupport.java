package com.hotclick.service.auth;

import org.slf4j.Logger;

/**
 * Auditoría de auth: un fallo de log no debe abortar el login/2FA.
 */
final class AuthAuditSupport {

    private static final String AUDIT_ERROR = "audit error: {}";

    private AuthAuditSupport() {}

    static void run(Logger log, Runnable action) {
        try {
            action.run();
        } catch (Exception e) {
            log.warn(AUDIT_ERROR, e.getMessage());
        }
    }
}
