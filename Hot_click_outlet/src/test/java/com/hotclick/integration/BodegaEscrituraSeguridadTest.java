package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import com.hotclick.utils.TelefonoBodega;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SEC-08 (teléfono validado en el backend) y SEC-11 (alta, import, edición y baja de bodegas solo
 * para ADMIN/EMPRENDEDOR, con la empresa de la sesión).
 */
@DisplayName("[SEC-08/SEC-11] Escritura de bodegas: rol, empresa de la sesión y teléfono")
class BodegaEscrituraSeguridadTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository  bodegaRepository;

    private Empresa empresaA;
    private Empresa empresaB;
    private String  tokenA;
    private String  tokenSinEmpresa;
    private Bodega  bodegaA;
    private Bodega  bodegaB;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresaA = crearEmpresa("Escritura Alpha", "escritura-alpha");
        empresaB = crearEmpresa("Escritura Beta", "escritura-beta");

        Usuario a = crearUsuario("escritura-a@test.cr", "Empr A", rolEmp);
        a.setEmpresa(empresaA);
        a = usuarioRepository.saveAndFlush(a);
        tokenA = "Bearer " + jwtUtil.generateToken(a.getCorreo(), a.getId(),
            Constants.ROL_EMPRENDEDOR, empresaA.getId(), empresaA.getSlug());

        Usuario huerfano = crearUsuario("escritura-sin@test.cr", "Empr sin empresa", rolEmp);
        tokenSinEmpresa = "Bearer " + jwtUtil.generateToken(huerfano.getCorreo(), huerfano.getId(),
            Constants.ROL_EMPRENDEDOR, null, null);

        bodegaB = crearBodega("Bodega Beta", empresaB);
    }

    @AfterEach
    void tearDown() {
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── SEC-11: rol ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("Comprador: crear, importar, editar y borrar → 403 y no cambia nada")
    void comprador_403() throws Exception {
        crear(userToken, "{\"nombreBodega\":\"X\",\"direccionExacta\":\"Y\",\"telefono\":\"88881234\"}")
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/bodegas/bulk").header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("[{\"nombreBodega\":\"X\",\"direccionExacta\":\"Y\",\"telefono\":\"88881234\"}]"))
            .andExpect(status().isForbidden());
        actualizar(userToken, bodegaB, "{\"nombreBodega\":\"Hackeada\"}").andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/bodegas/" + bodegaB.getId()).header("Authorization", userToken))
            .andExpect(status().isForbidden());

        assertThat(bodegaRepository.count()).isEqualTo(1);
        Bodega b = bodegaRepository.findById(bodegaB.getId()).orElseThrow();
        assertThat(b.getNombreBodega()).isEqualTo("Bodega Beta");
        assertThat(b.getEstado()).isEqualTo(Constants.ESTADO_ACTIVO);
    }

    @Test
    @DisplayName("Emprendedor: la empresa sale de la sesión aunque el body pida otra")
    void emprendedor_empresaDeLaSesion() throws Exception {
        crear(tokenA, "{\"nombreBodega\":\"Mía\",\"direccionExacta\":\"San José\",\"telefono\":\"+506 8888-1234\","
                + "\"empresaId\":\"" + empresaB.getId() + "\",\"empresa\":\"" + empresaB.getId() + "\"}")
            .andExpect(status().isOk());

        Bodega creada = bodegaRepository.findAll().stream()
            .filter(b -> "Mía".equals(b.getNombreBodega())).findFirst().orElseThrow();
        assertThat(creada.getEmpresaId()).isEqualTo(empresaA.getId());
        assertThat(creada.getTelefono()).isEqualTo("+50688881234");
    }

    @Test
    @DisplayName("Emprendedor sin empresa en la sesión: crear e importar → 403")
    void emprendedorSinEmpresa_403() throws Exception {
        crear(tokenSinEmpresa, "{\"nombreBodega\":\"X\",\"direccionExacta\":\"Y\",\"telefono\":\"88881234\"}")
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/bodegas/bulk").header("Authorization", tokenSinEmpresa)
                .contentType(MediaType.APPLICATION_JSON)
                .content("[{\"nombreBodega\":\"X\",\"direccionExacta\":\"Y\",\"telefono\":\"88881234\"}]"))
            .andExpect(status().isForbidden());
        assertThat(bodegaRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Otra empresa: editar o borrar una bodega ajena → 403 (antes 400) y no cambia")
    void otraEmpresa_403() throws Exception {
        actualizar(tokenA, bodegaB, "{\"nombreBodega\":\"Hackeada\",\"telefono\":\"88880000\"}")
            .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/bodegas/" + bodegaB.getId()).header("Authorization", tokenA))
            .andExpect(status().isForbidden());
        Bodega b = bodegaRepository.findById(bodegaB.getId()).orElseThrow();
        assertThat(b.getNombreBodega()).isEqualTo("Bodega Beta");
        assertThat(b.getTelefono()).isEqualTo("88881111");
        assertThat(b.getEstado()).isEqualTo(Constants.ESTADO_ACTIVO);
    }

    @Test
    @DisplayName("IT Admin: puede crear (bodega sin empresa, como antes) y editar cualquiera")
    void admin_puede() throws Exception {
        crear(adminToken, "{\"nombreBodega\":\"Central\",\"direccionExacta\":\"Heredia\",\"telefono\":\"22223333\"}")
            .andExpect(status().isOk());
        actualizar(adminToken, bodegaB, "{\"telefono\":\"+1 305 555 1234\"}").andExpect(status().isOk());
        assertThat(bodegaRepository.findById(bodegaB.getId()).orElseThrow().getTelefono()).isEqualTo("+13055551234");
    }

    // ── SEC-08: teléfono ─────────────────────────────────────────────────────

    @ParameterizedTest(name = "crear con teléfono {0} → 400")
    @ValueSource(strings = {"abc", "<b>x</b>", "+506 8888 123", "123456789012345678901234567890123", "' OR 1=1 --"})
    void crear_telefonoInvalido_400(String telefono) throws Exception {
        crear(tokenA, "{\"nombreBodega\":\"Mala\",\"direccionExacta\":\"Y\",\"telefono\":\"" + telefono + "\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(TelefonoBodega.MENSAJE_INVALIDO));
        assertThat(bodegaRepository.findAll()).noneMatch(b -> "Mala".equals(b.getNombreBodega()));
    }

    @Test
    @DisplayName("Editar con teléfono inválido → 400 y no se guarda; válido → se normaliza")
    void actualizar_telefono() throws Exception {
        bodegaA = crearBodega("Bodega Alpha", empresaA);
        actualizar(tokenA, bodegaA, "{\"telefono\":\"<b>x</b>\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(TelefonoBodega.MENSAJE_INVALIDO));
        actualizar(tokenA, bodegaA, "{\"telefono\":\"" + "9".repeat(25) + "\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(TelefonoBodega.MENSAJE_INVALIDO));
        assertThat(bodegaRepository.findById(bodegaA.getId()).orElseThrow().getTelefono()).isEqualTo("88881111");

        actualizar(tokenA, bodegaA, "{\"telefono\":\"8812-0034\"}").andExpect(status().isOk());
        assertThat(bodegaRepository.findById(bodegaA.getId()).orElseThrow().getTelefono()).isEqualTo("+50688120034");
    }

    @Test
    @DisplayName("Import: las filas con teléfono inválido se omiten; las válidas se guardan normalizadas")
    void bulk_omiteTelefonosInvalidos() throws Exception {
        mockMvc.perform(post("/api/bodegas/bulk").header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("[{\"nombreBodega\":\"Buena\",\"direccionExacta\":\"Y\",\"telefono\":\"+50688881234\"},"
                    + "{\"nombreBodega\":\"Mala\",\"direccionExacta\":\"Y\",\"telefono\":\"<b>x</b>\"}]"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(1))
            .andExpect(jsonPath("$.data.errors").value(1));
        List<Bodega> deA = bodegaRepository.findAll().stream()
            .filter(b -> empresaA.getId().equals(b.getEmpresaId())).toList();
        assertThat(deA).extracting(Bodega::getNombreBodega).containsExactly("Buena");
        assertThat(deA.get(0).getTelefono()).isEqualTo("+50688881234");
    }

    private ResultActions crear(String token, String json) throws Exception {
        return mockMvc.perform(post("/api/bodegas").header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions actualizar(String token, Bodega b, String json) throws Exception {
        return mockMvc.perform(put("/api/bodegas/" + b.getId()).header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private Empresa crearEmpresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Bodega crearBodega(String nombre, Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setDireccionExacta("Calle Bodegas 1");
        b.setTelefono("88881111");
        b.setCorreoContacto("contacto-" + nombre.replace(' ', '-').toLowerCase() + "@test.cr");
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }
}
