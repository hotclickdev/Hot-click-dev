package com.hotclick.service.catalogo;

/**
 * FROM/JOIN/WHERE compartidos por el chat público y el RAG.
 * El gate de empresa es el mismo que GET /api/productos (skill visibilidad-catalogo-marketplace).
 */
public final class CatalogoChatSql {

    private CatalogoChatSql() {}

    public static String joins(boolean marketplace) {
        String joins = " LEFT JOIN hot_click_categoria_tb c ON p.fk_id_categoria = c.id_categoria";
        if (marketplace) {
            joins += " LEFT JOIN hot_click_empresa_tb emp ON p.fk_id_empresa = emp.id_empresa";
        }
        return joins;
    }

    /**
     * @param usarStockReservado true en RAG (stock disponible); false en chat SSE (stock_actual).
     */
    public static String whereVisible(boolean marketplace, boolean usarStockReservado) {
        String stock = usarStockReservado
            ? "(p.stock_actual - COALESCE(p.stock_reservado, 0)) > 0"
            : "p.stock_actual > 0";
        return "p.fk_id_estado = 1 AND p.visible_catalogo = TRUE AND p.vendido = FALSE AND "
            + stock + " AND " + filtroEmpresa(marketplace);
    }

    /**
     * Ficha del asesor: el cliente ya está en el producto (puede estar sin stock).
     * Sigue el gate de empresa; no exige stock ni {@code vendido = FALSE}.
     */
    public static String whereFichaAsesor(boolean marketplace) {
        return "p.fk_id_estado = 1 AND p.visible_catalogo = TRUE AND " + filtroEmpresa(marketplace);
    }

    public static String filtroEmpresa(boolean marketplace) {
        if (marketplace) {
            return "(p.fk_id_empresa IS NULL OR (emp.estado_empresa = 'ACTIVO' AND emp.visibilidad_publica = TRUE))";
        }
        return "p.fk_id_empresa = ?";
    }

    public static void bindEmpresaSiTenant(java.util.List<Object> params, Long empresaId, boolean marketplace) {
        if (!marketplace) {
            params.add(empresaId);
        }
    }
}
