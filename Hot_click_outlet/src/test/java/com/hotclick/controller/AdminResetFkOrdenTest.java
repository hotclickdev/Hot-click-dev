package com.hotclick.controller;

import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** P9-04 condición de Seguridad: encargos y reportes de producto se borran antes que pedidos y productos. */
@ExtendWith(MockitoExtension.class)
class AdminResetFkOrdenTest {

    @Mock JdbcTemplate jdbc;
    @Mock CompanyScope companyScope;
    @Mock PropietarioGuard propietarioGuard;
    @InjectMocks AdminResetController controller;

    @Test
    void borraEncargoYReporteProductoAntesDePedidoYProducto() {
        when(companyScope.getCurrentEmpresaId()).thenReturn(5L);
        controller.resetearDatos();

        List<String> sql = new ArrayList<>();
        mockingDetails(jdbc).getInvocations().forEach(inv -> {
            if ("update".equals(inv.getMethod().getName())) sql.add(inv.getArgument(0));
        });

        int encargo = indice(sql, "DELETE FROM hot_click_encargo_tb");
        int reporte = indice(sql, "DELETE FROM hot_click_reporte_producto_tb");
        int pedido = indice(sql, "DELETE FROM hot_click_pedido_tb ");
        int producto = indice(sql, "DELETE FROM hot_click_producto_tb ");
        assertThat(encargo).isNotNegative().isLessThan(pedido).isLessThan(producto);
        assertThat(reporte).isNotNegative().isLessThan(producto);
    }

    private static int indice(List<String> sql, String prefijo) {
        for (int i = 0; i < sql.size(); i++) if (sql.get(i).startsWith(prefijo)) return i;
        return -1;
    }
}
