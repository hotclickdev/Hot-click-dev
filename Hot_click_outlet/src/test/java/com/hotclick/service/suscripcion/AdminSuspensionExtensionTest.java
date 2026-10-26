package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.controller.AdminSuspensionController;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.model.Suscripcion;
import com.hotclick.model.SuspensionExtension;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.SuspensionExtensionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.SuspensionImpagoInterceptor;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.payment.StockReservationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.authorization.method.AuthorizationManagerBeforeMethodInterceptor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Admin impago: suspensión manual, gracia y 'Dar 3 días extra'")
class AdminSuspensionExtensionTest {

    static final ZoneId CR = ZoneId.of("America/Costa_Rica");
    static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 26, 12, 0);

    EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
    SuscripcionRepository subRepo = mock(SuscripcionRepository.class);
    SuspensionExtensionRepository extRepo = mock(SuspensionExtensionRepository.class);
    PedidoRepository pedidoRepo = mock(PedidoRepository.class);
    SuscripcionPlanSupport planSupport = mock(SuscripcionPlanSupport.class);
    AuditoriaAdminRegistroService auditoria = mock(AuditoriaAdminRegistroService.class);
    CompanyScope scope = mock(CompanyScope.class);
    AdminSuspensionService svc;

    @BeforeEach
    void setUp() {
        svc = new AdminSuspensionService(empresaRepo, subRepo, extRepo, pedidoRepo, planSupport, auditoria, scope, 8, 3);
        svc.setClock(Clock.fixed(AHORA.atZone(CR).toInstant(), CR));
        when(scope.idActorAuditoria()).thenReturn(1L);
        when(scope.correoActorAuditoria()).thenReturn("admin@hc.test");
    }

    @AfterEach
    void limpiar() { SecurityContextHolder.clearContext(); }

    Empresa empresa(long id, String estado) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setNombreEmpresa("Tienda " + id);
        e.setEstadoEmpresa(estado);
        e.setVisibilidadPublica(true);
        when(empresaRepo.findById(id)).thenReturn(Optional.of(e));
        return e;
    }

    Suscripcion sub(long id, String estado, LocalDate fechaFin) {
        Suscripcion s = new Suscripcion();
        ReflectionTestUtils.setField(s, "id", id);
        s.setEstado(estado);
        s.setFechaFin(fechaFin);
        return s;
    }

    SuspensionExtension extVigente(long empresaId) {
        SuspensionExtension x = new SuspensionExtension();
        x.setEmpresaId(empresaId);
        x.setSuscripcionId(50L);
        x.setGraciaDesde(LocalDate.of(2026, 10, 14).atStartOfDay());
        x.setGraciaHasta(AHORA.minusHours(2));
        x.setOtorgadaEn(AHORA.minusHours(2));
        x.setVenceEn(AHORA.plusDays(3));
        when(extRepo.findTopByEmpresaIdAndVenceEnAfterOrderByVenceEnDesc(eq(empresaId), any())).thenReturn(Optional.of(x));
        return x;
    }

    SuspensionImpagoInterceptor interceptor(String estado) {
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(empresaRepo.findEstadoEmpresaById(7L)).thenReturn(Optional.of(estado));
        return new SuspensionImpagoInterceptor(scope, empresaRepo, new ObjectMapper(), svc);
    }

    @Nested
    @DisplayName("1. Suspensión manual con bitácora")
    class SuspensionManual {
        @Test
        void suspendeTiendaEnGraciaYRegistraAdminMotivoHora() {
            empresa(7, "ACTIVO");
            when(subRepo.findTopByEmpresaIdAndEstadoOrderByFechaCreacionDesc(7L, "PAST_DUE"))
                .thenReturn(Optional.of(sub(50, "PAST_DUE", LocalDate.of(2026, 10, 20))));
            when(empresaRepo.suspenderPorImpagoManual(7L)).thenReturn(1);

            Map<String, Object> r = svc.suspender(7L, "  No pagó tras 3 avisos ");

            assertEquals("SUSPENDIDO_IMPAGO", r.get("estado"));
            verify(subRepo).marcarVencidoSiPastDue(50L);
            verifyNoInteractions(planSupport);
            ArgumentCaptor<String> detalle = ArgumentCaptor.forClass(String.class);
            verify(auditoria).registrar(eq("ADMIN_SUSPENDER_IMPAGO"), eq("EMPRESA"), eq(7L), eq(7L), detalle.capture());
            assertEquals("Motivo: No pagó tras 3 avisos", detalle.getValue());
        }

        @Test
        void suspensionManualNoBajaElPlan() {
            Empresa e = empresa(7, "ACTIVO");
            com.hotclick.model.Plan pro = new com.hotclick.model.Plan();
            pro.setNombre("PRO");
            e.setPlan(pro);
            Object planAntes = e.getPlan();
            when(subRepo.findTopByEmpresaIdAndEstadoOrderByFechaCreacionDesc(7L, "PAST_DUE"))
                .thenReturn(Optional.of(sub(50, "PAST_DUE", LocalDate.of(2026, 10, 20))));
            when(empresaRepo.suspenderPorImpagoManual(7L)).thenReturn(1);

            svc.suspender(7L, "Impago");

            assertSame(planAntes, e.getPlan());
            assertEquals("PRO", e.getPlan().getNombre());
            verifyNoInteractions(planSupport);
            verify(empresaRepo, never()).save(any());
        }

        @Test
        void sinMotivoOSinDeudaOTiendaNoActivaNoSuspendeNiAudita() {
            empresa(7, "ACTIVO");
            assertThrows(IllegalArgumentException.class, () -> svc.suspender(7L, " "));
            assertThrows(IllegalStateException.class, () -> svc.suspender(7L, "motivo válido"));
            empresa(8, "SUSPENDIDO_IMPAGO");
            assertThrows(IllegalStateException.class, () -> svc.suspender(8L, "motivo válido"));
            verify(empresaRepo, never()).suspenderPorImpagoManual(anyLong());
            verifyNoInteractions(auditoria);
        }

        @Test
        void listaTiendasEnGraciaConDiasRestantes() {
            Empresa e = empresa(7, "ACTIVO");
            Suscripcion s = sub(50, "PAST_DUE", LocalDate.of(2026, 10, 20)); // hoy 26 = día 6 → quedan 3 (6, 7, 8)
            s.setEmpresa(e);
            when(subRepo.findPastDueConEmpresa()).thenReturn(List.of(s));
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> g = (List<Map<String, Object>>) svc.listar().get("enGracia");
            assertEquals(1, g.size());
            assertEquals(3L, g.get(0).get("diasRestantes"));
            assertEquals(LocalDate.of(2026, 10, 28), g.get(0).get("ultimoDiaVenta"));
            assertEquals(1L, svc.diasRestantes(LocalDate.of(2026, 10, 18), AHORA.toLocalDate()));
            assertEquals(0L, svc.diasRestantes(LocalDate.of(2026, 10, 10), AHORA.toLocalDate()));
        }
    }

    @Nested
    @DisplayName("2. Extensión una sola vez por ciclo")
    class ExtensionUnaVez {
        @BeforeEach
        void ciclo() {
            empresa(7, "SUSPENDIDO_IMPAGO");
            when(subRepo.findTopByEmpresaIdAndEstadoOrderByFechaCreacionDesc(7L, "VENCIDO"))
                .thenReturn(Optional.of(sub(50, "VENCIDO", LocalDate.of(2026, 10, 13))));
        }

        @Test
        void primeraVezOtorgaDiasDeConfigYRegistra() {
            when(empresaRepo.pasarAExtensionImpago(7L)).thenReturn(1);
            svc.darExtension(7L, "Pagará el lunes");
            ArgumentCaptor<SuspensionExtension> c = ArgumentCaptor.forClass(SuspensionExtension.class);
            verify(extRepo).saveAndFlush(c.capture());
            assertEquals(50L, c.getValue().getSuscripcionId());
            assertEquals(AHORA.plusDays(3), c.getValue().getVenceEn());
            assertEquals(LocalDate.of(2026, 10, 14).atStartOfDay(), c.getValue().getGraciaDesde());
            assertEquals("admin@hc.test", c.getValue().getAdminEmail());
            verify(auditoria).registrar(eq("ADMIN_EXTENSION_IMPAGO"), eq("EMPRESA"), eq(7L), eq(7L), contains("Pagará el lunes"));
        }

        @Test
        void segundaVezEnElMismoCicloSeRechaza() {
            when(extRepo.existsBySuscripcionId(50L)).thenReturn(true);
            assertThrows(IllegalStateException.class, () -> svc.darExtension(7L, "otra vez"));
            verify(extRepo, never()).saveAndFlush(any());
            verify(empresaRepo, never()).pasarAExtensionImpago(anyLong());
        }

        @Test
        void carreraConcurrenteChocaConUniqueYSeRechaza() {
            when(extRepo.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq"));
            assertThrows(IllegalStateException.class, () -> svc.darExtension(7L, "doble clic"));
            verify(empresaRepo, never()).pasarAExtensionImpago(anyLong());
        }

        @Test
        void diasDeExtensionVienenDeConfigYFueraDeRangoFallaCerrado() {
            AdminSuspensionService cinco = new AdminSuspensionService(empresaRepo, subRepo, extRepo, pedidoRepo,
                planSupport, auditoria, scope, 8, 5);
            assertEquals(5, cinco.getDiasExtension());
            assertThrows(IllegalStateException.class, () -> new AdminSuspensionService(empresaRepo, subRepo, extRepo,
                pedidoRepo, planSupport, auditoria, scope, 8, 0));
        }
    }

    @Nested
    @DisplayName("3. Oculta y sin compra durante la extensión")
    class OcultaSinCompra {
        @Test
        void productoDeTiendaEnExtensionNoEsPublicableNiComprable() {
            Empresa e = new Empresa();
            e.setEstadoEmpresa("EXTENSION_IMPAGO");
            e.setVisibilidadPublica(true);
            Producto p = new Producto();
            p.setEstado(1);
            p.setVisibleCatalogo(true);
            p.setEmpresa(e);
            assertFalse(StockReservationService.esPublicableEnMemoria(p));
            e.setEstadoEmpresa("ACTIVO");
            assertTrue(StockReservationService.esPublicableEnMemoria(p));
        }

        @Test
        void extensionCuentaComoSuspendidaParaPlanYReactivaAlPagar() {
            assertTrue(SuspensionImpago.estaSuspendida("EXTENSION_IMPAGO"));
            assertTrue(SuspensionImpago.enExtension("EXTENSION_IMPAGO"));
            assertFalse(SuspensionImpago.enExtension("SUSPENDIDO_IMPAGO"));
            Empresa e = new Empresa();
            e.setEstadoEmpresa("EXTENSION_IMPAGO");
            assertTrue(SuspensionImpago.reactivarSiSuspendida(e));
            assertEquals("ACTIVO", e.getEstadoEmpresa());
        }
    }

    @Nested
    @DisplayName("4. 403 a pedidos nuevos, POS y productos")
    class Bloqueos403 {
        @ParameterizedTest(name = "{0} {1} → 403")
        @CsvSource({
            "POST,/api/pedidos", "POST,/api/pedidos/manual", "GET,/api/pedidos", "GET,/api/pedidos/pendientes",
            "DELETE,/api/pedidos/900", "POST,/api/pos/ventas", "GET,/api/pos/cajas",
            "GET,/api/productos", "POST,/api/productos", "PUT,/api/productos/5", "DELETE,/api/productos/5",
            "PUT,/api/pedidos/999/estado"
        })
        void enExtensionBloquea(String metodo, String ruta) throws Exception {
            extVigente(7);
            when(pedidoRepo.countGestionableEnGracia(eq(900L), eq(7L), any(), any())).thenReturn(1L);
            MockHttpServletResponse res = new MockHttpServletResponse();
            assertFalse(interceptor("EXTENSION_IMPAGO").preHandle(new MockHttpServletRequest(metodo, ruta), res, new Object()));
            assertEquals(403, res.getStatus());
            assertTrue(res.getContentAsString().contains("SUSCRIPCION_IMPAGA"));
        }
    }

    @Nested
    @DisplayName("5. Pedidos de la gracia se pueden gestionar")
    class PedidosDeGracia {
        @ParameterizedTest(name = "{0} {1} pasa")
        @CsvSource({
            "GET,/api/pedidos/900", "GET,/api/pedidos/900/despacho", "PUT,/api/pedidos/900/estado",
            "PUT,/api/pedidos/900/guia", "PUT,/api/pedidos/900/envio", "GET,/api/billing/impago/pedidos",
            "GET,/api/billing/impago", "POST,/api/billing/impago/pagar"
        })
        void pedidoDeGraciaPasa(String metodo, String ruta) throws Exception {
            SuspensionExtension x = extVigente(7);
            when(pedidoRepo.countGestionableEnGracia(900L, 7L, x.getGraciaDesde(), x.getGraciaHasta())).thenReturn(1L);
            assertTrue(interceptor("EXTENSION_IMPAGO").preHandle(new MockHttpServletRequest(metodo, ruta),
                new MockHttpServletResponse(), new Object()));
        }

        @Test
        void sinExtensionVigenteOSuspendidaNoGestionaPedidos() throws Exception {
            when(extRepo.findTopByEmpresaIdAndVenceEnAfterOrderByVenceEnDesc(eq(7L), any())).thenReturn(Optional.empty());
            when(pedidoRepo.countGestionableEnGracia(anyLong(), anyLong(), any(), any())).thenReturn(1L);
            assertFalse(interceptor("EXTENSION_IMPAGO").preHandle(new MockHttpServletRequest("PUT", "/api/pedidos/900/estado"),
                new MockHttpServletResponse(), new Object()));
            extVigente(7);
            assertFalse(interceptor("SUSPENDIDO_IMPAGO").preHandle(new MockHttpServletRequest("PUT", "/api/pedidos/900/estado"),
                new MockHttpServletResponse(), new Object()));
        }

        @Test
        void listaSoloPedidosDeLaVentana() {
            SuspensionExtension x = extVigente(7);
            svc.pedidosDeGracia(7L);
            verify(pedidoRepo).findCreadosEnGracia(7L, x.getGraciaDesde(), x.getGraciaHasta(),
                    org.springframework.data.domain.PageRequest.of(0, AdminSuspensionService.LIMITE_PEDIDOS_GRACIA));
        }
    }

    @Nested
    @DisplayName("6. 403 a usuario no ADMIN")
    class SoloAdmin {
        AdminSuspensionController proxy() {
            ProxyFactory f = new ProxyFactory(new AdminSuspensionController(svc));
            f.setProxyTargetClass(true);
            f.addAdvisor(AuthorizationManagerBeforeMethodInterceptor.preAuthorize());
            return (AdminSuspensionController) f.getProxy();
        }

        void como(String rol) {
            SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("u", "p", rol));
        }

        @ParameterizedTest(name = "{0} → 403")
        @CsvSource({"ROLE_EMPRENDEDOR", "ROLE_CLIENTE", "ROLE_MIEMBRO", "ROLE_VENDEDOR"})
        void noAdminRecibeAccessDenied(String rol) {
            como(rol);
            AdminSuspensionController c = proxy();
            assertThrows(AccessDeniedException.class, c::listar);
            assertThrows(AccessDeniedException.class, () -> c.suspender(7L, Map.of("motivo", "x x x")));
            assertThrows(AccessDeniedException.class, () -> c.extension(7L, Map.of("motivo", "x x x")));
            verifyNoInteractions(empresaRepo, auditoria);
        }

        @Test
        void adminPasa() {
            como("ROLE_ADMIN");
            assertNotNull(proxy().listar());
        }
    }

    @Nested
    @DisplayName("7. Al vencer la extensión vuelve a la suspensión")
    class VenceExtension {
        @Test
        void vencidasVuelvenASuspendidoImpago() {
            when(extRepo.findEmpresasConExtensionVencida(AHORA)).thenReturn(List.of(7L, 9L));
            when(empresaRepo.volverASuspensionImpago(List.of(7L, 9L))).thenReturn(2);
            assertEquals(2, svc.vencerExtensiones());
        }

        @Test
        void sinVencidasNoTocaNada() {
            when(extRepo.findEmpresasConExtensionVencida(AHORA)).thenReturn(List.of());
            assertEquals(0, svc.vencerExtensiones());
            verify(empresaRepo, never()).volverASuspensionImpago(any());
        }

        @Test
        void vencidaPeroJobPendienteYaNoGestionaPedidos() throws Exception {
            when(extRepo.findTopByEmpresaIdAndVenceEnAfterOrderByVenceEnDesc(eq(7L), any())).thenReturn(Optional.empty());
            assertFalse(svc.permitidaEnExtension(7L, "GET /api/billing/impago/pedidos"));
        }
    }
}
