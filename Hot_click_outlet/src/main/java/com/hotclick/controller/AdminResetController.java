package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.ResetPlataformaKeepQaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

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
    @Autowired private com.hotclick.security.PropietarioGuard propietarioGuard;
    @Autowired private ResetPlataformaKeepQaService resetPlataformaKeepQaService;
    @Autowired private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    static final String PASSWORD_INCORRECTA = "PASSWORD_INCORRECTA";

    /** Borrado de datos: exige volver a escribir la contraseña del usuario que lo pide (seg-altos-2 (c)). */
    private ResponseEntity<ResponseDTO> exigirPassword(Map<String, String> body) {
        String password = body == null ? null : body.get("password");
        var actor = companyScope.getCurrentUser();
        if (password == null || password.isEmpty() || actor == null || actor.getContrasenaHash() == null
                || !passwordEncoder.matches(password, actor.getContrasenaHash())) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(
                "Contraseña incorrecta. Escribí tu contraseña para confirmar.", Map.of("codigo", PASSWORD_INCORRECTA)));
        }
        return null;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/reset-plataforma-qa")
    public ResponseEntity<ResponseDTO> resetearPlataformaQa(@RequestBody(required = false) Map<String, String> body) {
        ResponseEntity<ResponseDTO> sinPassword = exigirPassword(body);
        if (sinPassword != null) return sinPassword;
        String confirmacion = body == null ? null : body.get("confirmacion");
        if (!ResetPlataformaKeepQaService.CONFIRMACION.equals(confirmacion)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(
                "Para vaciar la plataforma escribí: " + ResetPlataformaKeepQaService.CONFIRMACION));
        }
        Map<String, Object> resumen = resetPlataformaKeepQaService.ejecutar();
        return ResponseEntity.ok(ResponseDTO.success(
            "Se borraron tiendas, usuarios y productos. Quedan admin, las 3 cuentas QA y el mostrador POS.",
            resumen));
    }

    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    @PostMapping("/reset-datos")
    @Transactional
    public ResponseEntity<ResponseDTO> resetearDatos(@RequestBody(required = false) Map<String, String> body) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) {
            if (companyScope.isAdminIT()) {
                ResponseEntity<ResponseDTO> sinPassword = exigirPassword(body);
                if (sinPassword != null) return sinPassword;
                Map<String, Object> resumen = resetPlataformaKeepQaService.ejecutar();
                return ResponseEntity.ok(ResponseDTO.success(
                    "Se borraron tiendas, usuarios y productos. Quedan admin, las 3 cuentas QA y el mostrador POS.",
                    resumen));
            }
            return ResponseEntity.badRequest().body(ResponseDTO.error(
                "Esta acción requiere estar dentro del contexto de un negocio."));
        }
        // P9-04: solo el PROPIETARIO (no LECTOR/EDITOR ni sesión de soporte) borra los datos del negocio.
        propietarioGuard.exigirPropietario(empresaId);
        ResponseEntity<ResponseDTO> sinPassword = exigirPassword(body);
        if (sinPassword != null) return sinPassword;
        var actor = companyScope.getCurrentUser();
        org.slf4j.LoggerFactory.getLogger(AdminResetController.class).warn(
            "[reset-datos] empresa={} borrada por usuario={}", empresaId, actor != null ? actor.getId() : null);

        // Encargos (FK a pedido y producto, sin ON DELETE; sus eventos caen en cascada) y reportes de
        // producto (FK sin ON DELETE): sin esto el borrado de productos daba 500 (revisión seg 063eb7f0d).
        jdbc.update("DELETE FROM hot_click_encargo_tb WHERE fk_id_empresa = ? OR fk_id_producto IN " +
            "(SELECT id_producto FROM hot_click_producto_tb WHERE fk_id_empresa = ?)", empresaId, empresaId);
        jdbc.update("DELETE FROM hot_click_reporte_producto_tb WHERE fk_id_producto IN " +
            "(SELECT id_producto FROM hot_click_producto_tb WHERE fk_id_empresa = ?)", empresaId);

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
