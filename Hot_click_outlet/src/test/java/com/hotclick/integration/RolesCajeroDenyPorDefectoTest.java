package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@DisplayName("CAJERO: asignable en el equipo, deny por defecto en escrituras salvo venta POS, turno y QR POS")
class RolesCajeroDenyPorDefectoTest extends BaseIntegrationTest {

    private static final String MSG_CAJERO = "Tu rol de Cajero solo puede operar el punto de venta.";
    private static final String MSG_LECTOR = "Tu rol de Lector es solo de visualización.";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private MetodoCobroRepository metodoCobroRepository;
    @Autowired private SolicitudAprobacionRepository solicitudAprobacionRepository;
    @Autowired private CodigoOtpRepository codigoOtpRepository;
    @Autowired private TurnoCajaRepository turnoCajaRepository;

    private Empresa emp;
    private Usuario uCajero;
    private String tokenDueno, tokenLector, tokenCajero;

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("CAJ"); e.setNombreComercial("CAJ"); e.setSlug("caj-dd");
        e.setCorreoEmpresa("cdd@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tokenDueno = miembro("cdd-dueno@test.cr", "PROPIETARIO", rolEmp);
        tokenLector = miembro("cdd-lector@test.cr", "LECTOR", rolEmp);
        tokenCajero = miembro("cdd-cajero@test.cr", "CAJERO", rolEmp);
        uCajero = usuarioRepository.findByCorreo("cdd-cajero@test.cr").orElseThrow();
    }

    @AfterEach
    void tearDown() {
        turnoCajaRepository.deleteAll();
        solicitudAprobacionRepository.deleteAll();
        metodoCobroRepository.deleteAll();
        codigoOtpRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private String miembro(String correo, String rolEquipo, Rol rol) {
        Usuario u = crearUsuario(correo, rolEquipo, rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private MockHttpServletResponse call(MockHttpServletRequestBuilder b, String token) throws Exception {
        return mockMvc.perform(b.header("Authorization", token)).andReturn().getResponse();
    }

    /** 403 del interceptor (no un 403/400 propio del endpoint). */
    private boolean bloqueadoPorRol(MockHttpServletResponse r, String msg) throws Exception {
        return r.getStatus() == 403 && r.getContentAsString().contains(msg);
    }

    private Map<String, MockHttpServletRequestBuilder> escriturasNegocio() {
        Map<String, MockHttpServletRequestBuilder> m = new LinkedHashMap<>();
        m.put("POST /api/productos", json(post("/api/productos"), "{}"));
        m.put("POST /api/inventario/paquetes", json(post("/api/inventario/paquetes"), "{}"));
        m.put("POST /api/stock/ajuste-entrada/{id}", json(post("/api/stock/ajuste-entrada/999999"), "{}"));
        m.put("POST /api/bodegas", json(post("/api/bodegas"), "{}"));
        m.put("POST /api/cupones/solicitar", json(post("/api/cupones/solicitar"), "{}"));
        m.put("POST /api/categorias", json(post("/api/categorias"), "{}"));
        m.put("POST /api/metodos-cobro", json(post("/api/metodos-cobro"), "{\"tipo\":\"SINPE\",\"dato\":\"88887777\"}"));
        m.put("PUT /api/metodos-cobro/{id}", json(put("/api/metodos-cobro/999999"), "{}"));
        m.put("PUT /api/empresa/perfil", json(put("/api/empresa/perfil"), "{}"));
        m.put("POST /api/empresa/equipo", json(post("/api/empresa/equipo"), "{}"));
        m.put("PUT /api/empresa/equipo/{id}/rol", json(put("/api/empresa/equipo/999999/rol"), "{\"rolEnEmpresa\":\"EDITOR\"}"));
        m.put("PUT /api/pedidos/{id}/estado", json(put("/api/pedidos/999999/estado"), "{\"estado\":\"ENTREGADO\"}"));
        m.put("POST /api/wallet/payout", json(post("/api/wallet/payout"), "{\"monto\":1000}"));
        m.put("POST /api/ventas", json(post("/api/ventas"), "{}"));
        return m;
    }

    @Test
    void duenoPuedeInvitarYAsignarCajero() throws Exception {
        String body = "{\"nombre\":\"Caja Uno\",\"correo\":\"cdd-caja1@test.cr\",\"password\":\"Pass1234!\","
            + "\"telefono\":\"88001122\",\"rolEnEmpresa\":\"CAJERO\"}";
        assertThat(call(json(post("/api/empresa/equipo"), body), tokenDueno).getStatus()).isEqualTo(200);
        Usuario invitado = usuarioRepository.findByCorreo("cdd-caja1@test.cr").orElseThrow();
        assertThat(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(invitado.getId(), emp.getId()))
            .get().extracting(MiembroEmpresa::getRolEnEmpresa).isEqualTo("CAJERO");
        Usuario lector = usuarioRepository.findByCorreo("cdd-lector@test.cr").orElseThrow();
        var r = call(json(put("/api/empresa/equipo/" + lector.getId() + "/rol"), "{\"rolEnEmpresa\":\"CAJERO\"}"), tokenDueno);
        assertThat(r.getStatus()).as(r.getContentAsString()).isEqualTo(200);
    }

    @Test
    void cajeroRecibe403EnEscriturasDeNegocio() throws Exception {
        List<String> abiertos = new ArrayList<>();
        for (var e : escriturasNegocio().entrySet()) {
            var r = call(e.getValue(), tokenCajero);
            // 403 de rol o de otra capa previa (p.ej. /api/inventario/paquetes ya corta antes del interceptor)
            if (r.getStatus() != 403) abiertos.add(e.getKey() + " -> " + r.getStatus());
        }
        assertThat(abiertos).as("escrituras de negocio que CAJERO todavía puede hacer").isEmpty();
    }

    @Test
    void cajeroOperaVentaPosTurnoYQrPeroNadaMas() throws Exception {
        // Abrir y cerrar su turno de verdad.
        var abrir = call(json(post("/api/pos/caja/abrir"), "{\"montoInicial\":1000}"), tokenCajero);
        assertThat(abrir.getStatus()).as(abrir.getContentAsString()).isEqualTo(200);
        TurnoCaja turno = turnoCajaRepository.findByUsuario_IdAndEstado(uCajero.getId(), "ABIERTO").orElseThrow();
        var cerrar = call(json(put("/api/pos/caja/" + turno.getId() + "/cerrar"), "{\"montoDeclarado\":1000}"), tokenCajero);
        assertThat(cerrar.getStatus()).as(cerrar.getContentAsString()).isEqualTo(200);
        // Venta POS y gestión de QR POS: el interceptor no las corta (el endpoint valida el cuerpo).
        Map<String, MockHttpServletRequestBuilder> pos = new LinkedHashMap<>();
        pos.put("POST /api/pos/venta", json(post("/api/pos/venta"), "{}"));
        pos.put("POST /api/pos/qr", json(post("/api/pos/qr"), "{}"));
        pos.put("PUT /api/pos/qr/{token}/confirmar-sinpe", json(put("/api/pos/qr/no-existe/confirmar-sinpe"), "{}"));
        pos.put("DELETE /api/pos/qr/{token}", delete("/api/pos/qr/no-existe"));
        for (var e : pos.entrySet()) {
            assertThat(bloqueadoPorRol(call(e.getValue(), tokenCajero), MSG_CAJERO)).as(e.getKey()).isFalse();
        }
        // Y lo que no está en la lista sigue cerrado.
        assertThat(bloqueadoPorRol(call(json(post("/api/productos"), "{}"), tokenCajero), MSG_CAJERO)).isTrue();
    }

    @Test
    void lectorSigueIgualConLaListaDeCajero() throws Exception {
        // Regresión: la lista blanca de CAJERO no se filtra a LECTOR.
        for (var b : List.of(json(post("/api/pos/venta"), "{}"), json(post("/api/pos/caja/abrir"), "{}"),
                              json(post("/api/pos/qr"), "{}"), json(post("/api/productos"), "{}"))) {
            assertThat(bloqueadoPorRol(call(b, tokenLector), MSG_LECTOR)).isTrue();
        }
        assertThat(call(json(post("/api/contacto"), "{}"), tokenLector).getStatus()).isNotEqualTo(403);
    }
}
