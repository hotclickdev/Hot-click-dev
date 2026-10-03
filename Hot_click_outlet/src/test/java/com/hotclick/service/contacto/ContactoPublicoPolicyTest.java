package com.hotclick.service.contacto;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("[NEGOCIO] Contacto directo del vendedor al visitante: solo PYME y NEGOCIO_PLUS")
class ContactoPublicoPolicyTest {

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
        "EMPRENDEDOR, false",
        "PYME, true",
        "NEGOCIO_PLUS, true",
        "GRATUITO, false",
        "pyme, true",
        "' negocio_plus ', true",
        "PLAN_DESCONOCIDO, false",
    })
    void porPlan(String plan, boolean esperado) {
        assertThat(ContactoPublicoPolicy.permiteContacto(plan)).isEqualTo(esperado);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("Sin plan: niega por defecto")
    void sinPlan_niega(String plan) {
        assertThat(ContactoPublicoPolicy.permiteContacto(plan)).isFalse();
    }

    @Test
    @DisplayName("El Plan estructurado manda sobre plan_saas (mismo criterio que la comisión)")
    void planEntidad_mandaSobrePlanSaas() {
        assertThat(ContactoPublicoPolicy.permiteContacto(empresa("EMPRENDEDOR", "PYME"))).isFalse();
        assertThat(ContactoPublicoPolicy.permiteContacto(empresa("NEGOCIO_PLUS", "GRATUITO"))).isTrue();
        assertThat(ContactoPublicoPolicy.permiteContacto(empresa(null, "PYME"))).isTrue();
        assertThat(ContactoPublicoPolicy.permiteContacto(empresa(null, "GRATUITO"))).isFalse();
        assertThat(ContactoPublicoPolicy.permiteContacto((Empresa) null)).isFalse();
    }

    @ParameterizedTest(name = "servicio, plan {0} → {1}")
    @CsvSource({"EMPRENDEDOR, false", "PYME, true", "NEGOCIO_PLUS, true"})
    void servicio_leePlanDelBackend(String plan, boolean esperado) {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findNombrePlanEfectivo(5L)).thenReturn(Optional.of(plan));
        assertThat(new ContactoPublicoService(repo).permiteContacto(5L)).isEqualTo(esperado);
    }

    @Test
    @DisplayName("Servicio: empresa inexistente, id nulo o error de base niegan")
    void servicio_casosBorde_niegan() {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findNombrePlanEfectivo(1L)).thenReturn(Optional.empty());
        when(repo.findNombrePlanEfectivo(2L)).thenThrow(new IllegalStateException("db caída"));
        ContactoPublicoService servicio = new ContactoPublicoService(repo);
        assertThat(servicio.permiteContacto(1L)).isFalse();
        assertThat(servicio.permiteContacto(2L)).isFalse();
        assertThat(servicio.permiteContacto(null)).isFalse();
    }

    static Empresa empresa(String planEntidad, String planSaas) {
        Empresa e = new Empresa();
        if (planEntidad != null) {
            Plan p = new Plan();
            p.setNombre(planEntidad);
            e.setPlan(p);
        }
        e.setPlanSaas(planSaas);
        return e;
    }
}
