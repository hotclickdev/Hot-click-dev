package com.hotclick.controller.storefront;

import com.hotclick.model.Empresa;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.contacto.ContactoPublicoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("[NEGOCIO] /api/tienda/{slug}: WhatsApp e Instagram solo con plan PYME o NEGOCIO_PLUS")
class StorefrontInfoMapperContactoTest {

    @ParameterizedTest(name = "plan {0} → contacto {1}")
    @CsvSource({"EMPRENDEDOR, false", "GRATUITO, false", "PYME, true", "NEGOCIO_PLUS, true"})
    void contactoSegunPlan(String plan, boolean conContacto) {
        EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
        when(empresaRepo.findNombrePlanEfectivo(77L)).thenReturn(Optional.of(plan));
        BodegaRepository bodegaRepo = mock(BodegaRepository.class);
        when(bodegaRepo.findByEmpresaIdAndEstado(anyLong(), any())).thenReturn(List.of());
        StorefrontInfoMapper mapper = new StorefrontInfoMapper(bodegaRepo, new ContactoPublicoService(empresaRepo));

        Map<String, Object> info = mapper.info(empresa());

        assertThat(info.get("contactoDirecto")).isEqualTo(conContacto);
        assertThat(info.get("whatsapp")).isEqualTo(conContacto ? "50688880506" : "");
        assertThat(info.get("instagram")).isEqualTo(conContacto ? "casaluna506" : "");
        // El resto de la vitrina no cambia con el plan
        assertThat(info.get("descripcion")).isEqualTo("Taller familiar");
        assertThat(info.get("nombreComercial")).isEqualTo("Casa Luna 506");
        assertThat(info.toString()).doesNotContain("tienda@casaluna.cr", "22223333");
    }

    private static Empresa empresa() {
        Empresa e = new Empresa();
        e.setId(77L);
        e.setSlug("casa-luna-506");
        e.setNombreComercial("Casa Luna 506");
        e.setNumeroWhatsapp("50688880506");
        e.setInstagram("casaluna506");
        e.setCorreoEmpresa("tienda@casaluna.cr");
        e.setTelefonoEmpresa("22223333");
        e.setDescripcion("Taller familiar");
        return e;
    }
}
