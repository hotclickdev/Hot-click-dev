package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Restablece los datos de negocio de la empresa del caller (pedidos, productos,
 * marcas, categorías, carritos, cotizaciones, órdenes de compra, testimonios,
 * publicaciones, forecasts/reportes). Se conservan usuarios, roles y la propia
 * empresa/cuenta.
 *
 * Reemplaza una implementación anterior que hacía TRUNCATE global (sin filtrar
 * por empresa — hubiera borrado los datos de TODOS los negocios de la
 * plataforma) sobre nombres de tabla en mayúsculas que no existen en el
 * esquema actual (por eso el botón nunca funcionó).
 */
@RestController
@RequestMapping("/api/admin")
public class AdminResetController {

    @Autowired private JdbcTemplate  jdbc;
    @Autowired private CompanyScope  companyScope;

    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    @PostMapping("/reset-datos")
    @Transactional
    public ResponseEntity<ResponseDTO> resetearDatos() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(
                "Esta acción requiere estar dentro del contexto de un negocio."));
        }

        // Hijos de pedido
        jdbc.update("DELETE FROM hot_click_pago_tb WHERE fk_id_pedido IN " +
            "(SELECT id_pedido FROM hot_click_pedido_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_split_pago_tb WHERE fk_id_pedido IN " +
            "(SELECT id_pedido FROM hot_click_pedido_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_comprobante_sinpe_tb WHERE fk_id_pedido IN " +
            "(SELECT id_pedido FROM hot_click_pedido_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_giro_ruleta_tb WHERE fk_id_pedido IN " +
            "(SELECT id_pedido FROM hot_click_pedido_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_solicitud_garantia_tb WHERE fk_id_pedido IN " +
            "(SELECT id_pedido FROM hot_click_pedido_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_pedido_item_tb WHERE fk_id_pedido IN " +
            "(SELECT id_pedido FROM hot_click_pedido_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_comprobante_fiscal_tb WHERE fk_id_empresa = ?", empresaId);

        // Hijos de producto
        jdbc.update("DELETE FROM hot_click_solicitud_garantia_tb WHERE fk_id_producto IN " +
            "(SELECT id_producto FROM hot_click_producto_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_testimonio_tb WHERE fk_id_producto IN " +
            "(SELECT id_producto FROM hot_click_producto_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_producto_imagen_tb WHERE fk_id_producto IN " +
            "(SELECT id_producto FROM hot_click_producto_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_publicacion_fb_tb WHERE fk_id_producto IN " +
            "(SELECT id_producto FROM hot_click_producto_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_movimiento_stock_tb WHERE fk_id_producto IN " +
            "(SELECT id_producto FROM hot_click_producto_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_precio_sugerido_tb WHERE fk_id_producto IN " +
            "(SELECT id_producto FROM hot_click_producto_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_premio_tb WHERE fk_id_producto_premio IN " +
            "(SELECT id_producto FROM hot_click_producto_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_forecast_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_reporte_tb WHERE fk_id_empresa = ?", empresaId);

        // Pedidos
        jdbc.update("DELETE FROM hot_click_pedido_tb WHERE fk_id_empresa = ?", empresaId);

        // Compras
        jdbc.update("DELETE FROM hot_click_orden_compra_item_tb WHERE fk_id_orden IN " +
            "(SELECT id_orden FROM hot_click_orden_compra_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_orden_compra_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_proveedor_tb WHERE fk_id_empresa = ?", empresaId);

        // Cotizaciones (B2B)
        jdbc.update("DELETE FROM hot_click_cotizacion_item_tb WHERE cotizacion_id IN " +
            "(SELECT id_cotizacion FROM hot_click_cotizacion_tb WHERE empresa_id = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_cotizacion_tb WHERE empresa_id = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_cotizacion_cliente_tb WHERE empresa_id = ?", empresaId);

        // Carritos
        jdbc.update("DELETE FROM hot_click_carrito_item_tb WHERE fk_id_carrito IN " +
            "(SELECT id_carrito FROM hot_click_carrito_tb WHERE fk_id_empresa = ?)", empresaId);
        jdbc.update("DELETE FROM hot_click_carrito_tb WHERE fk_id_empresa = ?", empresaId);
        // hot_click_carrito_abandonado_tb no tiene fk_id_empresa (se limpia por
        // DataRetentionScheduler globalmente, no está scoped por negocio).

        // Catálogo
        jdbc.update("DELETE FROM hot_click_producto_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_categoria_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_marca_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_bodega_tb WHERE fk_id_empresa = ?", empresaId);

        // Operación diaria
        jdbc.update("DELETE FROM hot_click_turno_caja_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_mesa_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_gasto_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_cupon_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_gift_card_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_solicitud_aprobacion_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_solicitud_especial_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_solicitud_servicio_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_solicitud_recoleccion_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_pos_qr_sesion_tb WHERE fk_id_empresa = ?", empresaId);

        // IA / chat / historial
        jdbc.update("DELETE FROM hot_click_ai_mensaje_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_ai_uso_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_chat_mensaje_shopping_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_chat_sesion_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("UPDATE hot_click_wa_log_tb SET fk_id_empresa = NULL WHERE fk_id_empresa = ?", empresaId);

        return ResponseEntity.ok(ResponseDTO.success("Datos del negocio eliminados correctamente", null));
    }
}
