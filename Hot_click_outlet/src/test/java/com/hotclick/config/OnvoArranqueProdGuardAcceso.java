package com.hotclick.config;

import org.springframework.mock.env.MockEnvironment;

/** Acceso de test al guard (constructor con el default del @Value: false). */
public final class OnvoArranqueProdGuardAcceso {
    private OnvoArranqueProdGuardAcceso() {}

    private static boolean arranca(boolean optIn) {
        MockEnvironment e = new MockEnvironment();
        e.setActiveProfiles("prod");
        try { new OnvoArranqueProdGuard(e, OnvoArranqueProdGuard.PREFIJO_TEST + "k", optIn).verificar(); return true; }
        catch (IllegalStateException ex) { return false; }
    }
    public static boolean prodArrancaConLlaveTestSinOptIn() { return arranca(false); }
    public static boolean prodArrancaConLlaveTestConOptIn() { return arranca(true); }
}
