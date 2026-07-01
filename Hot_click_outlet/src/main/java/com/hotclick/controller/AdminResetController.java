package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminResetController {

    @Autowired
    private JdbcTemplate jdbc;

    @PostMapping("/reset-datos")
    @Transactional
    public ResponseEntity<ResponseDTO> resetearDatos() {
        // Elimina datos de negocio en orden (respeta FKs con CASCADE).
        // Se preservan: usuarios, roles, permisos, estados, países y tablas de configuración.
        jdbc.execute("""
            TRUNCATE TABLE
                "HOT_CLICK_PEDIDO_HISTORIAL_ESTADO_TB",
                "HOT_CLICK_PEDIDO_ITEM_TB",
                "HOT_CLICK_FACTURA_DETALLE_TB",
                "HOT_CLICK_FACTURA_TB",
                "HOT_CLICK_PEDIDO_TB",
                "hot_click_pago_tb",
                "hot_click_transaccion_pago_tb",
                "hot_click_webhook_event_tb",
                "hot_click_payment_log_tb",
                "HOT_CLICK_CARRITO_DESCUENTO_TB",
                "HOT_CLICK_CARRITO_ITEM_TB",
                "HOT_CLICK_CARRITO_TB",
                "hot_click_carrito_abandonado_tb",
                "HOT_CLICK_COTIZACION_DETALLE_TB",
                "HOT_CLICK_COTIZACION_TB",
                "HOT_CLICK_CLIENTE_COTIZACION_TB",
                "HOT_CLICK_PRODUCTO_ATRIBUTO_ASIGNACION_TB",
                "HOT_CLICK_PRODUCTO_VARIANTE_ATRIBUTO_TB",
                "HOT_CLICK_PRODUCTO_VARIANTE_TB",
                "HOT_CLICK_PRODUCTO_IMAGEN_TB",
                "HOT_CLICK_PRODUCTO_VIDEO_TB",
                "HOT_CLICK_PRODUCTO_ETIQUETA_TB",
                "HOT_CLICK_MOVIMIENTO_INVENTARIO_TB",
                "HOT_CLICK_INVENTARIO_PRODUCTO_PERIODICO_TB",
                "HOT_CLICK_INVENTARIO_PERIODICO_TB",
                "HOT_CLICK_ANALISIS_PRODUCTO_TB",
                "HOT_CLICK_PRODUCTO_METRICA_TB",
                "HOT_CLICK_SUGERENCIA_COMPRA_TB",
                "HOT_CLICK_SUGERENCIA_CLIENTE_TB",
                "HOT_CLICK_HISTORIAL_CLIENTE_TB",
                "HOT_CLICK_PRODUCTO_PROVEEDOR_TB",
                "HOT_CLICK_PRODUCTO_ATRIBUTO_VALOR_TB",
                "HOT_CLICK_PRODUCTO_ATRIBUTO_TB",
                "HOT_CLICK_GARANTIA_PRODUCTO_TB",
                "HOT_CLICK_GARANTIA_TB",
                "HOT_CLICK_IMPUESTO_EXENTO_PRODUCTO_TB",
                "HOT_CLICK_PRODUCTO_TB",
                "HOT_CLICK_CATEGORIA_EXENTA_TB",
                "HOT_CLICK_CATEGORIA_ETIQUETA_TB",
                "HOT_CLICK_ETIQUETA_TB",
                "HOT_CLICK_CATEGORIA_TB",
                "hot_click_marca_tb",
                "HOT_CLICK_BODEGA_HISTORIAL_TB",
                "HOT_CLICK_BODEGA_USUARIO_TB",
                "HOT_CLICK_BODEGA_UBICACION_TB",
                "HOT_CLICK_BODEGA_TB",
                "HOT_CLICK_PROVEEDOR_TB",
                "HOT_CLICK_GIRO_RULETA_TB",
                "HOT_CLICK_RESULTADO_RULETA_TB",
                "HOT_CLICK_PREMIO_TB",
                "HOT_CLICK_REFERIDO_DETALLE_TB",
                "HOT_CLICK_REFERIDO_TB",
                "HOT_CLICK_TESTIMONIO_TB",
                "HOT_CLICK_WHATSAPP_ENVIO_TB",
                "HOT_CLICK_PLANTILLA_WHATSAPP_TB",
                "hot_click_publicacion_fb_tb",
                "HOT_CLICK_SOLICITUD_SERVICIO_TB",
                "HOT_CLICK_ALERTA_TB",
                "HOT_CLICK_ALERTA_NEGOCIO_TB",
                "HOT_CLICK_FINANZA_PRODUCTO_TB",
                "HOT_CLICK_FINANZA_GLOBAL_TB",
                "HOT_CLICK_GASTO_OPERATIVO_TB",
                "HOT_CLICK_METRICA_VENTA_TB",
                "HOT_CLICK_DASHBOARD_KPI_TB",
                "HOT_CLICK_AUDITORIA_TB",
                "HOT_CLICK_LOG_ERROR_TB",
                "HOT_CLICK_LOG_CONEXION_TB",
                "HOT_CLICK_FILTRO_ADMIN_TB",
                "hot_click_precio_sugerido_tb"
            RESTART IDENTITY CASCADE
            """);

        return ResponseEntity.ok(ResponseDTO.success("Datos eliminados correctamente", null));
    }
}
