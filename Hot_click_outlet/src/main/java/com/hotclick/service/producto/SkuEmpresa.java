package com.hotclick.service.producto;

/** SKU interno autoincremental por negocio: E{empresaId}-0004 */
public final class SkuEmpresa {

    private SkuEmpresa() {}

    public static String formato(long empresaId, int numeroLocal) {
        return "E" + empresaId + "-" + String.format("%04d", numeroLocal);
    }
}
