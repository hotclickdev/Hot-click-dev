package com.hotclick.integration;

import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.EmprendedorRegistroService;
import com.hotclick.service.onvo.cuenta.OnvoCuentaConectadaClient;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/** Registro de empresa (perfil test, sin llave → cliente simulado) crea la cuenta conectada tras el commit. */
@DisplayName("Registro de empresa — cuenta conectada ONVO")
class RegistroCuentaOnvoTest extends BaseIntegrationTest {

    @Autowired private EmprendedorRegistroService emprendedorRegistroService;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private EmpresaCuentaOnvoRepository cuentaRepo;
    @Autowired private OnvoCuentaConectadaClient client;

    @BeforeEach
    void setUp() { obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5); }

    @AfterEach
    void tearDown() {
        cuentaRepo.deleteAll();
        jdbcTemplate.update("UPDATE hot_click_empresa_tb SET fk_id_bodega_venta_online = NULL");
        bodegaRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("registro-empresa → cuenta ONVO creada (mock test), onboardingUrl guardado, no activa")
    void registroCreaCuenta() {
        RegistroEmpresaDTO dto = new RegistroEmpresaDTO();
        dto.setNombreEmpresa("Tienda Onvo Registro");
        dto.setCorreoEmpresa("onvo-reg@test.cr");
        dto.setNombreAdmin("Ana Onvo");
        dto.setCorreoAdmin("admin-onvo-reg@test.cr");
        dto.setPasswordAdmin("Clave1234!");

        Usuario u = emprendedorRegistroService.registrar(dto);

        assertThat(client.isSimulado()).isTrue();
        EmpresaCuentaOnvo c = cuentaRepo.findByEmpresaId(u.getEmpresa().getId()).orElseThrow();
        assertThat(c.getOnvoAccountId()).startsWith("ca_mock_");
        assertThat(c.getEstado()).isEqualTo(EmpresaCuentaOnvo.PENDIENTE_ONBOARDING);
        assertThat(c.getOnboardingUrl()).isNotBlank();
        assertThat(c.getOnboardingExpiraEn()).isNotNull();
        assertThat(c.isActiva()).isFalse();
    }
}
