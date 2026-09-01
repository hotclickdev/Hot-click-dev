package com.hotclick.service;

import com.hotclick.dto.EncargoAprobarRequest;
import com.hotclick.dto.EncargoCreateRequest;
import com.hotclick.model.EncargoPersonalizado;
import com.hotclick.model.Producto;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Regresión liviana del dominio de encargos (validaciones de precio en rango).
 */
class EncargoPersonalizadoDomainTest {

    @Test
    void modoYEstadosConstantes() {
        assertEquals("FIJO", EncargoPersonalizado.MODO_FIJO);
        assertEquals("RANGO", EncargoPersonalizado.MODO_RANGO);
        assertEquals("COTIZACION", EncargoPersonalizado.MODO_COTIZACION);
        assertEquals(7, EncargoPersonalizado.DIAS_VENCIMIENTO_COTIZACION);
    }

    @Test
    void requestCreateTieneCamposRequeridos() {
        EncargoCreateRequest req = new EncargoCreateRequest();
        req.setProductoId(10L);
        req.setNombreCliente("Ana");
        req.setEmail("ana@example.com");
        assertEquals(10L, req.getProductoId());
        assertEquals("Ana", req.getNombreCliente());
    }

    @Test
    void aprobarRequestPrecio() {
        EncargoAprobarRequest req = new EncargoAprobarRequest();
        req.setPrecioCotizado(8500);
        assertEquals(8500, req.getPrecioCotizado());
    }

    @Test
    void productoPersonalizadoFlags() {
        Producto p = new Producto();
        p.setEsPersonalizado(true);
        p.setModoPrecioPersonalizado("RANGO");
        p.setPrecioPersonalizadoMin(5000);
        p.setPrecioPersonalizadoMax(20000);
        assertTrue(p.getEsPersonalizado());
        assertEquals("RANGO", p.getModoPrecioPersonalizado());
        assertEquals(5000, p.getPrecioPersonalizadoMin());
        assertEquals(20000, p.getPrecioPersonalizadoMax());
    }
}
