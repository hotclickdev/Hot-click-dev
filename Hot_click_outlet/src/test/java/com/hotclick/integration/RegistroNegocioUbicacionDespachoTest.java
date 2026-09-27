package com.hotclick.integration;

import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.EmprendedorRegistroService;
import com.hotclick.service.UbicacionDespachoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El alta de un negocio (registro-empresa, upgrade-emprendedor, nuevo-negocio) crea la
 * primera bodega con la ubicación de despacho y la deja como bodega de venta online.
 * Los payloads viejos, sin ubicación, siguen funcionando igual.
 */
@DisplayName("Alta de negocio — ubicación de despacho")
class RegistroNegocioUbicacionDespachoTest extends BaseIntegrationTest {

    private static final String SQL_BODEGA_VENTA_ONLINE =
        "SELECT fk_id_bodega_venta_online FROM hot_click_empresa_tb WHERE id_empresa = ?";

    @Autowired private EmprendedorRegistroService emprendedorRegistroService;
    @Autowired private UbicacionDespachoService   ubicacionDespachoService;
    @Autowired private EmpresaRepository          empresaRepository;
    @Autowired private BodegaRepository           bodegaRepository;

    @BeforeEach
    void setUp() {
        obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("UPDATE hot_click_empresa_tb SET fk_id_bodega_venta_online = NULL");
        bodegaRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("registro-empresa con ubicación → bodega creada, normalizada y ligada")
    void registrar_conUbicacion_creaBodegaLigada() {
        RegistroEmpresaDTO dto = dtoRegistro("ubic-reg@test.cr");
        dto.setProvincia("San José");
        dto.setCanton("Santa Ana");
        dto.setDireccionExacta("100 m norte del parque");
        dto.setPermiteRetiroCliente(true);

        Usuario creado = emprendedorRegistroService.registrar(dto);

        Long empresaId = creado.getEmpresa().getId();
        List<Bodega> bodegas = bodegaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        assertThat(bodegas).hasSize(1);
        Bodega bodega = bodegas.get(0);
        assertThat(bodega.getNombreBodega()).isEqualTo("Despacho Tienda Ubicación");
        assertThat(bodega.getProvincia()).isEqualTo("SAN JOSE");
        assertThat(bodega.getCanton()).isEqualTo("SANTA ANA");
        assertThat(bodega.getDireccionExacta()).isEqualTo("100 m norte del parque");
        assertThat(bodega.getTelefono()).isEqualTo("22224444");
        assertThat(bodega.getPermiteRetiroCliente()).isTrue();
        assertThat(bodegaVentaOnlineDe(empresaId)).isEqualTo(bodega.getId());
        assertThat(ubicacionDespachoService.empresaTieneUbicacion(empresaId)).isTrue();
    }

    @Test
    @DisplayName("registro-empresa sin ubicación (payload viejo) → sin bodega, alta igual")
    void registrar_sinUbicacion_noCreaBodega() {
        Usuario creado = emprendedorRegistroService.registrar(dtoRegistro("ubic-viejo@test.cr"));

        Long empresaId = creado.getEmpresa().getId();
        assertThat(bodegaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO)).isEmpty();
        assertThat(bodegaVentaOnlineDe(empresaId)).isNull();
    }

    @Test
    @DisplayName("registro-empresa con ubicación a medias → 400 lógico y no queda empresa")
    void registrar_ubicacionAMedias_rechazaSinCrearEmpresa() {
        RegistroEmpresaDTO dto = dtoRegistro("ubic-medias@test.cr");
        dto.setProvincia("Heredia");

        assertThatThrownBy(() -> emprendedorRegistroService.registrar(dto))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(empresaRepository.existsByCorreoEmpresa("ubic-medias@test.cr")).isFalse();
    }

    @Test
    @DisplayName("POST /api/auth/upgrade-emprendedor con ubicación → bodega ligada")
    void upgrade_conUbicacion_creaBodega() throws Exception {
        String body = """
            {"nombreEmpresa":"Upgrade Ubic","correoEmpresa":"upgrade-ubic@test.cr",
             "telefonoEmpresa":"22225555","provincia":"Heredia","canton":"Belén",
             "direccionExacta":"Del Automercado 100 m sur","permiteRetiroCliente":false}
            """;
        mockMvc.perform(post("/api/auth/upgrade-emprendedor")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());

        Empresa empresa = empresaRepository.findByCorreoEmpresa("upgrade-ubic@test.cr").orElseThrow();
        List<Bodega> bodegas = bodegaRepository.findByEmpresaIdAndEstado(empresa.getId(), Constants.ESTADO_ACTIVO);
        assertThat(bodegas).extracting(Bodega::getCanton).containsExactly("BELEN");
        assertThat(bodegaVentaOnlineDe(empresa.getId())).isEqualTo(bodegas.get(0).getId());
    }

    @Test
    @DisplayName("POST /api/auth/upgrade-emprendedor sin ubicación (payload viejo) → 200 sin bodega")
    void upgrade_sinUbicacion_200() throws Exception {
        String body = """
            {"nombreEmpresa":"Upgrade Viejo","correoEmpresa":"upgrade-viejo@test.cr"}
            """;
        mockMvc.perform(post("/api/auth/upgrade-emprendedor")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());

        Empresa empresa = empresaRepository.findByCorreoEmpresa("upgrade-viejo@test.cr").orElseThrow();
        assertThat(bodegaRepository.findByEmpresaIdAndEstado(empresa.getId(), Constants.ESTADO_ACTIVO)).isEmpty();
    }

    @Test
    @DisplayName("POST /api/auth/nuevo-negocio con ubicación → bodega ligada")
    void nuevoNegocio_conUbicacion_creaBodega() throws Exception {
        String body = """
            {"nombreEmpresa":"Segundo Ubic","correoEmpresa":"segundo-ubic@test.cr",
             "provincia":"Limón","canton":"Pococí","direccionExacta":"Guápiles centro"}
            """;
        mockMvc.perform(post("/api/auth/nuevo-negocio")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());

        Empresa empresa = empresaRepository.findByCorreoEmpresa("segundo-ubic@test.cr").orElseThrow();
        List<Bodega> bodegas = bodegaRepository.findByEmpresaIdAndEstado(empresa.getId(), Constants.ESTADO_ACTIVO);
        assertThat(bodegas).hasSize(1);
        assertThat(bodegas.get(0).getProvincia()).isEqualTo("LIMON");
        assertThat(bodegas.get(0).getTelefono()).isEqualTo(testUser.getTelefono());
        assertThat(bodegaVentaOnlineDe(empresa.getId())).isEqualTo(bodegas.get(0).getId());
    }

    @Test
    @DisplayName("POST /api/auth/nuevo-negocio con ubicación a medias → 400 y no crea negocio")
    void nuevoNegocio_ubicacionAMedias_400() throws Exception {
        String body = """
            {"nombreEmpresa":"Medias","correoEmpresa":"medias-ubic@test.cr","canton":"Pococí"}
            """;
        mockMvc.perform(post("/api/auth/nuevo-negocio")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());

        assertThat(empresaRepository.existsByCorreoEmpresa("medias-ubic@test.cr")).isFalse();
    }

    @Test
    @DisplayName("POST /api/auth/nuevo-negocio sin ubicación (payload viejo) → 200 sin bodega")
    void nuevoNegocio_sinUbicacion_200() throws Exception {
        String body = """
            {"nombreEmpresa":"Viejo","correoEmpresa":"viejo-ubic@test.cr"}
            """;
        mockMvc.perform(post("/api/auth/nuevo-negocio")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());

        Empresa empresa = empresaRepository.findByCorreoEmpresa("viejo-ubic@test.cr").orElseThrow();
        assertThat(bodegaRepository.findByEmpresaIdAndEstado(empresa.getId(), Constants.ESTADO_ACTIVO)).isEmpty();
    }

    @Test
    @DisplayName("GET /api/bodegas devuelve provincia, cantón, retiro y horarios")
    void listarBodegas_incluyeUbicacionYHorarios() throws Exception {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa empresa = crearEmpresa();
        Usuario emprendedor = crearUsuario("empr-listar@test.cr", "Empr Listar", rolEmp);
        emprendedor.setEmpresa(empresa);
        emprendedor = usuarioRepository.saveAndFlush(emprendedor);
        crearBodega(empresa, emprendedor);

        mockMvc.perform(get("/api/bodegas")
                .header("Authorization", tokenPara(emprendedor, Constants.ROL_EMPRENDEDOR)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].provincia").value("HEREDIA"))
            .andExpect(jsonPath("$.data[0].canton").value("BELEN"))
            .andExpect(jsonPath("$.data[0].permiteRetiroCliente").value(true))
            .andExpect(jsonPath("$.data[0].horarioApertura").value("08:00"))
            .andExpect(jsonPath("$.data[0].horarioCierre").value("17:30"));
    }

    private Long bodegaVentaOnlineDe(Long empresaId) {
        return jdbcTemplate.queryForObject(SQL_BODEGA_VENTA_ONLINE, Long.class, empresaId);
    }

    private static RegistroEmpresaDTO dtoRegistro(String correo) {
        RegistroEmpresaDTO dto = new RegistroEmpresaDTO();
        dto.setNombreEmpresa("Tienda Ubicación");
        dto.setCorreoEmpresa(correo);
        dto.setTelefonoEmpresa("22224444");
        dto.setNombreAdmin("Ana Ubicación");
        dto.setCorreoAdmin("admin-" + correo);
        dto.setPasswordAdmin("Clave1234!");
        return dto;
    }

    private Empresa crearEmpresa() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("Listar Bodegas");
        e.setSlug("listar-bodegas");
        e.setCorreoEmpresa("listar-bodegas@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private void crearBodega(Empresa empresa, Usuario admin) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega Listar");
        b.setDireccionExacta("Centro de Belén");
        b.setTelefono("88887777");
        b.setProvincia("HEREDIA");
        b.setCanton("BELEN");
        b.setPermiteRetiroCliente(true);
        b.setHorarioApertura(LocalTime.of(8, 0));
        b.setHorarioCierre(LocalTime.of(17, 30));
        b.setAdminCliente(admin);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        bodegaRepository.saveAndFlush(b);
    }
}
