package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/bodegas devuelve dirección, teléfono, correo y encargado: solo se listan las
 * bodegas de la empresa del usuario. Un comprador sin empresa recibe una lista vacía.
 */
@DisplayName("[OWASP A01/API1] GET /api/bodegas limitado a la empresa del usuario")
class BodegaListadoScopeTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository  bodegaRepository;

    private Empresa empresaA;
    private Empresa empresaB;
    private String  tokenA;
    private Bodega  bodegaA;
    private Bodega  bodegaB;
    private Bodega  bodegaLegacy;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresaA = crearEmpresa("Bodegas Alpha", "bodegas-alpha");
        empresaB = crearEmpresa("Bodegas Beta", "bodegas-beta");

        Usuario emprendedorA = crearUsuario("bodegas-a@test.cr", "Empr Bodegas A", rolEmp);
        emprendedorA.setEmpresa(empresaA);
        emprendedorA = usuarioRepository.saveAndFlush(emprendedorA);
        tokenA = "Bearer " + jwtUtil.generateToken(emprendedorA.getCorreo(), emprendedorA.getId(),
            Constants.ROL_EMPRENDEDOR, empresaA.getId(), empresaA.getSlug());

        bodegaA      = crearBodega("Bodega Alpha", empresaA);
        bodegaB      = crearBodega("Bodega Beta", empresaB);
        bodegaLegacy = crearBodega("Bodega Legacy", null);
    }

    @AfterEach
    void tearDown() {
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Comprador sin empresa: 200 con lista vacía (sin datos de contacto de nadie)")
    void compradorSinEmpresa_listaVacia() throws Exception {
        mockMvc.perform(get("/api/bodegas").header("Authorization", userToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("Comprador sin empresa no puede pedir otra empresa con ?empresaId")
    void compradorSinEmpresa_ignoraEmpresaId() throws Exception {
        mockMvc.perform(get("/api/bodegas").param("empresaId", empresaA.getId().toString())
                .header("Authorization", userToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("Usuario de empresa: solo sus bodegas, sin las de otra empresa ni las legacy sin empresa")
    void usuarioEmpresa_soloLasSuyas() throws Exception {
        mockMvc.perform(get("/api/bodegas").header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(1)))
            .andExpect(jsonPath("$.data[0].id").value(bodegaA.getId()))
            .andExpect(jsonPath("$.data[0].empresaId").value(empresaA.getId()));
    }

    @Test
    @DisplayName("Usuario de empresa: ?empresaId de otra empresa se ignora")
    void usuarioEmpresa_noPuedePedirOtraEmpresa() throws Exception {
        mockMvc.perform(get("/api/bodegas").param("empresaId", empresaB.getId().toString())
                .header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(1)))
            .andExpect(jsonPath("$.data[0].id").value(bodegaA.getId()));
    }

    @Test
    @DisplayName("IT Admin: ve todas las bodegas activas")
    void adminIT_veTodas() throws Exception {
        mockMvc.perform(get("/api/bodegas").header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].id", hasItems(
                bodegaA.getId().intValue(), bodegaB.getId().intValue(), bodegaLegacy.getId().intValue())));
    }

    @Test
    @DisplayName("IT Admin con ?empresaId: las de esa empresa más las legacy sin empresa")
    void adminIT_filtraPorEmpresa() throws Exception {
        mockMvc.perform(get("/api/bodegas").param("empresaId", empresaB.getId().toString())
                .header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].id", hasItems(
                bodegaB.getId().intValue(), bodegaLegacy.getId().intValue())))
            .andExpect(jsonPath("$.data[*].id", not(hasItem(bodegaA.getId().intValue()))));
    }

    @Test
    @DisplayName("Sin autenticación: rechazado")
    void anonimo_rechazado() throws Exception {
        mockMvc.perform(get("/api/bodegas"))
            .andExpect(status().is4xxClientError());
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
