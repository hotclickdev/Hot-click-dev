package com.hotclick.integration;

import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.exception.CorreoYaRegistradoException;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.BodegaDespachoInicialService;
import com.hotclick.service.EmprendedorRegistroService;
import com.hotclick.service.TurnstileService;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Cuenta con registro de negocio a medias: códigos claros (403 EMPRESA_REQUERIDA / 409 CORREO_YA_REGISTRADO) y alta atómica. */
@DisplayName("Negocio incompleto: códigos de error claros y alta atómica")
class AuthNegocioIncompletoTest extends BaseIntegrationTest {

    @MockitoBean private TurnstileService turnstileService;
    @MockitoSpyBean private BodegaDespachoInicialService bodegaDespachoInicialService;
    @Autowired private EmprendedorRegistroService emprendedorRegistroService;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private String tokenSinEmpresa;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario sinEmpresa = crearUsuario("incompleto@test.cr", "Sin Negocio", rolEmp);
        tokenSinEmpresa = tokenPara(sinEmpresa, Constants.ROL_EMPRENDEDOR);
        when(turnstileService.verify(any(), anyString())).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        bodegaRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().stream().filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Nueva bodega, perfil y productos sin empresa → 403 con codigo EMPRESA_REQUERIDA")
    void sinEmpresa_codigoEmpresaRequerida() throws Exception {
        mockMvc.perform(post("/api/bodegas").header("Authorization", tokenSinEmpresa)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreBodega\":\"B\",\"telefono\":\"88880000\",\"direccionExacta\":\"x\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.data.codigo").value("EMPRESA_REQUERIDA"));
        mockMvc.perform(get("/api/empresa/perfil").header("Authorization", tokenSinEmpresa))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.data.codigo").value("EMPRESA_REQUERIDA"));
        mockMvc.perform(get("/api/productos/admin/todos").header("Authorization", tokenSinEmpresa))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.data.codigo").value("EMPRESA_REQUERIDA"));
    }

    @Test
    @DisplayName("registro-empresa con correo que ya tiene cuenta → 409 CORREO_YA_REGISTRADO con el siguiente paso")
    void registro_correoExistente_409() throws Exception {
        mockMvc.perform(post("/api/auth/registro-empresa").contentType(MediaType.APPLICATION_JSON)
                .content("{\"frecuenciaLiquidacion\":\"QUINCENAL\",\"nombreEmpresa\":\"Tienda X\",\"correoEmpresa\":\"tiendax@test.cr\",\"telefonoEmpresa\":\"22224444\","
                    + "\"nombreAdmin\":\"Ana\",\"correoAdmin\":\"incompleto@test.cr\",\"passwordAdmin\":\"Clave1234!\","
                    + "\"declaraMayoriaEdad\":true,\"turnstileToken\":\"ok\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.data.codigo").value(CorreoYaRegistradoException.CODIGO))
            .andExpect(jsonPath("$.data.siguientePaso").value(CorreoYaRegistradoException.SIGUIENTE_PASO));
        assertThat(empresaRepository.findAll()).noneMatch(e -> "tiendax@test.cr".equals(e.getCorreoEmpresa()));
    }

    @Test
    @DisplayName("Alta atómica: si falla un paso después de guardar la empresa, no queda ni empresa ni usuario")
    void registro_fallaAMitad_rollbackCompleto() {
        doThrow(new IllegalStateException("falla simulada")).when(bodegaDespachoInicialService).crear(any(), any(), any());
        RegistroEmpresaDTO dto = new RegistroEmpresaDTO();
        dto.setFrecuenciaLiquidacion("QUINCENAL");
        dto.setNombreEmpresa("Tienda Atomica");
        dto.setCorreoEmpresa("atomica@test.cr");
        dto.setTelefonoEmpresa("22224444");
        dto.setNombreAdmin("Ana Atomica");
        dto.setCorreoAdmin("admin-atomica@test.cr");
        dto.setPasswordAdmin("Clave1234!");
        dto.setProvincia("San José");
        dto.setCanton("Santa Ana");
        dto.setDireccionExacta("100 m norte del parque");

        assertThatThrownBy(() -> emprendedorRegistroService.registrar(dto)).isInstanceOf(IllegalStateException.class);
        assertThat(empresaRepository.findAll()).noneMatch(e -> "atomica@test.cr".equals(e.getCorreoEmpresa()));
        assertThat(usuarioRepository.findByCorreo("admin-atomica@test.cr")).isEmpty();
    }
}
