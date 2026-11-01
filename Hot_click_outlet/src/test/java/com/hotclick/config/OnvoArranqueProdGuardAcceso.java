package com.hotclick.config;

import org.springframework.mock.env.MockEnvironment;

/** Acceso de test al guard (constructor con el default del @Value: false). */
public final class OnvoArranqueProdGuardAcceso {
    private OnvoArranqueProdGuardAcceso() {}

    private static final String[][] CONFIG_BILLING = {
        {"hotclick.planes.moneda", "usd"},
        {"hotclick.planes.emprendedor.precio-mensual-usd", "9"},
        {"hotclick.planes.pyme.precio-mensual-usd", "24"},
        {"hotclick.planes.negocio-plus.precio-mensual-usd", "49"},
        {"onvo.price-id.pyme", "price_pyme_test"},
        {"onvo.price-id.negocio-plus", "price_plus_test"},
    };

    /** Entorno con toda la configuración de billing que el guard exige en prod (valores de prueba). */
    public static MockEnvironment conConfigBilling(MockEnvironment e) {
        for (String[] kv : CONFIG_BILLING) e.setProperty(kv[0], kv[1]);
        return e;
    }

    /** Igual que {@link #conConfigBilling} pero sin la propiedad indicada (ausente, no vacía). */
    public static MockEnvironment conConfigBillingExcepto(MockEnvironment e, String propiedad) {
        for (String[] kv : CONFIG_BILLING) if (!kv[0].equals(propiedad)) e.setProperty(kv[0], kv[1]);
        return e;
    }

    private static boolean arranca(boolean optIn) {
        MockEnvironment e = conConfigBilling(new MockEnvironment());
        e.setActiveProfiles("prod");
        try { new OnvoArranqueProdGuard(e, OnvoArranqueProdGuard.PREFIJO_TEST + "k", optIn).verificar(); return true; }
        catch (IllegalStateException ex) { return false; }
    }
    public static boolean prodArrancaConLlaveTestSinOptIn() { return arranca(false); }
    public static boolean prodArrancaConLlaveTestConOptIn() { return arranca(true); }
}
