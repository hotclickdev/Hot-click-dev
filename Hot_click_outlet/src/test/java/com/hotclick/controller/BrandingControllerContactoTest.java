package com.hotclick.controller;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.FeatureFlagService;
import com.hotclick.service.contacto.ContactoPublicoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("[NEGOCIO] /api/public/branding: WhatsApp del vendedor solo con plan PYME o NEGOCIO_PLUS")
class BrandingControllerContactoTest {

    @ParameterizedTest(name = "plan {0} → whatsapp visible {1}")
    @CsvSource({"EMPRENDEDOR, false", "PYME, true", "NEGOCIO_PLUS, true"})
    @SuppressWarnings("unchecked")
    void publico_segunPlan(String plan, boolean conContacto) {
        BrandingController controller = controller(plan);

        ResponseEntity<?> resp = controller.publicBranding("casa-luna-506");
        Map<String, Object> body = (Map<String, Object>) resp.getBody();

        assertThat(body).isNotNull();
        assertThat(body.get("contactoDirecto")).isEqualTo(conContacto);
        assertThat(body.get("whatsapp")).isEqualTo(conContacto ? "50688880506" : null);
        assertThat(body.get("nombreComercial")).isEqualTo("Casa Luna 506");
    }

    @Test
    @DisplayName("El mapa del panel de ADMIN no se toca: sigue trayendo el WhatsApp")
    void mapaAdmin_sinCambios() {
        assertThat(BrandingController.toBrandingMap(empresa()).get("whatsapp")).isEqualTo("50688880506");
    }

    private static BrandingController controller(String plan) {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findBySlug("casa-luna-506")).thenReturn(Optional.of(empresa()));
        when(repo.findNombrePlanEfectivo(77L)).thenReturn(Optional.of(plan));
        BrandingController c = new BrandingController();
        ReflectionTestUtils.setField(c, "empresaRepository", repo);
        ReflectionTestUtils.setField(c, "flagService", mock(FeatureFlagService.class));
        ReflectionTestUtils.setField(c, "contactoPublico", new ContactoPublicoService(repo));
        return c;
    }

    private static Empresa empresa() {
        Empresa e = new Empresa();
        e.setId(77L);
        e.setSlug("casa-luna-506");
        e.setNombreComercial("Casa Luna 506");
        e.setNumeroWhatsapp("50688880506");
        return e;
    }
}
