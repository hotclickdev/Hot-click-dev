package com.hotclick.service.producto;

import com.hotclick.model.Producto;
import com.hotclick.service.AuditoriaAdminRegistroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ProductoCambioAuditoria {

    @Autowired private AuditoriaAdminRegistroService auditoria;

    public void anotar(Producto despues, Long empresaId, String nombre, Integer precio, Integer stock) {
        String detalle = cambios(nombre, despues.getNombreProducto(), precio, despues.getPrecioVenta(), stock, despues.getStockActual());
        if (detalle.isBlank()) return;
        auditoria.registrar("PRODUCTO_EDICION", "PRODUCTO", despues.getId(), empresaId, detalle);
    }

    static String cambios(String nombreAntes, String nombre, Integer precioAntes, Integer precio,
                          Integer stockAntes, Integer stock) {
        StringBuilder texto = new StringBuilder();
        sumar(texto, "nombre", nombreAntes, nombre);
        sumar(texto, "precio", precioAntes, precio);
        sumar(texto, "stock", stockAntes, stock);
        return texto.toString();
    }

    private static void sumar(StringBuilder texto, String campo, Object antes, Object despues) {
        if (java.util.Objects.equals(antes, despues)) return;
        if (!texto.isEmpty()) texto.append("; ");
        texto.append(campo).append(": ").append(antes).append(" → ").append(despues);
    }
}
