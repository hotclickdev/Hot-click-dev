package com.hotclick.scheduler;

/** Expone esCreditoDuplicado (package-private) a tests de integración en otros paquetes. */
public final class WalletReconciliacionSchedulerTestAccess {
    private WalletReconciliacionSchedulerTestAccess() {}
    public static boolean esCreditoDuplicado(Throwable t) {
        return WalletReconciliacionScheduler.esCreditoDuplicado(t);
    }
}
