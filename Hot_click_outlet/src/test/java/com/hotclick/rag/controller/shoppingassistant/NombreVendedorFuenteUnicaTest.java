package com.hotclick.rag.controller.shoppingassistant;

import com.hotclick.model.Empresa;
import com.hotclick.service.contacto.ContactoTextoPublico;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Una sola regla para el nombre del vendedor: comercial si no está vacío, si no el legal (EmpresaNombre). */
class NombreVendedorFuenteUnicaTest {

    @Test
    void comercialVacioUsaElLegal() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("Sol S.A.");
        e.setNombreComercial("  ");
        assertThat(ShoppingAssistantTenantGuard.nombreComercial(e)).isEqualTo("Sol S.A.");
        e.setNombreComercial("Café Sol");
        assertThat(ShoppingAssistantTenantGuard.nombreComercial(e)).isEqualTo("Café Sol");
    }

    @Test
    void sqlDelAsistenteUsaLaMismaRegla() {
        assertThat(ContactoTextoPublico.SQL_NEGOCIO_PRODUCTO)
            .contains("COALESCE(NULLIF(TRIM(e.nombre_comercial), ''), e.nombre_empresa)")
            .contains("visibilidad_publica = TRUE");
    }
}
