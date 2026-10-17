package com.hotclick.service.producto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** S2 · Campos públicos del negocio para el checkout; sin poblar no se serializan (el front usa la config global). */
class ProductoContraEntregaCamposTest {

    @Test
    void poblado_conMinimo() {
        Empresa e = new Empresa();
        e.setAceptaContraEntrega(true);
        e.setContraEntregaMinimoCrc(4000);
        Producto p = new Producto();
        ProductoCatalogQueries.poblarContraEntrega(p, e);
        assertThat(p.getEmpresaAceptaContraEntrega()).isTrue();
        assertThat(p.getEmpresaContraEntregaMinimo()).isEqualTo(4000);
    }

    @Test
    void noAcepta_sinMinimo() {
        Empresa e = new Empresa();
        e.setAceptaContraEntrega(false);
        e.setContraEntregaMinimoCrc(4000);
        Producto p = new Producto();
        ProductoCatalogQueries.poblarContraEntrega(p, e);
        assertThat(p.getEmpresaAceptaContraEntrega()).isFalse();
        assertThat(p.getEmpresaContraEntregaMinimo()).isNull();
    }

    @Test
    void sinPoblar_noSeSerializa() throws Exception {
        String json = new ObjectMapper().findAndRegisterModules().writeValueAsString(new Producto());
        assertThat(json).doesNotContain("empresaAceptaContraEntrega").doesNotContain("empresaContraEntregaMinimo");
    }
}
