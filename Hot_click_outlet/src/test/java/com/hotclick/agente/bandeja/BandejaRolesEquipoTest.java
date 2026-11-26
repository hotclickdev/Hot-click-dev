package com.hotclick.agente.bandeja;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.config.WebMvcConfig;
import com.hotclick.security.CajeroSinCatalogoInterceptor;
import com.hotclick.security.CajeroSoloPosInterceptor;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.LectorSoloLecturaInterceptor;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.SlugTenantInterceptor;
import com.hotclick.security.SoloPropietarioNegocioInterceptor;
import com.hotclick.security.SuspensionImpagoInterceptor;
import com.hotclick.service.TenantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.handler.MappedInterceptor;
import org.springframework.web.util.ServletRequestPathUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Roles de equipo en la bandeja. LECTOR (solo visualización) y CAJERO (solo POS) llevan rol Spring EMPRENDEDOR, así
 * que la regla de seguridad por sí sola los deja pasar: los frena el deny por defecto de los interceptores de
 * {@code WebMvcConfig}, que cubren {@code /api/**} y no excluyen {@code /api/bandeja}. Este test usa los
 * interceptores reales y comprueba, además, que la configuración los aplica a la bandeja.
 */
class BandejaRolesEquipoTest {

    private final UUID id = UUID.randomUUID();
    private BandejaService service;
    private BandejaAvisoService aviso;
    private PropietarioGuard guard;
    private CompanyScope scope;
    private LectorSoloLecturaInterceptor lector;
    private CajeroSoloPosInterceptor cajero;

    @BeforeEach
    void init() {
        service = mock(BandejaService.class);
        aviso = mock(BandejaAvisoService.class);
        guard = mock(PropietarioGuard.class);
        scope = mock(CompanyScope.class);
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(scope.getCurrentUserId()).thenReturn(1L);
        TenantService tenant = mock(TenantService.class);
        when(tenant.tieneFeature("ai")).thenReturn(true);
        when(service.listar(any(), any(), any(), any(), any(), org.mockito.ArgumentMatchers.anyInt(),
            org.mockito.ArgumentMatchers.anyInt()))
            .thenReturn(new BandejaDtos.Pagina(List.of(), 0, 20, 0, false));
        when(service.detalle(any(), any(), any())).thenReturn(new BandejaDtos.Detalle(null, List.of()));
        when(service.resumen(any(), any())).thenReturn(new BandejaDtos.Resumen(0, 0));
        when(service.equipo(any(), any())).thenReturn(List.of());
        lector = new LectorSoloLecturaInterceptor(guard, scope, new ObjectMapper());
        cajero = new CajeroSoloPosInterceptor(guard, scope, new ObjectMapper());
        controllerTenant = tenant;
    }

    private TenantService controllerTenant;

    private MockMvc mvc() {
        return MockMvcBuilders.standaloneSetup(new BandejaController(service, aviso, scope, controllerTenant))
            .setControllerAdvice(new GlobalExceptionHandler())
            .addInterceptors(lector, cajero).build();
    }

    private List<MockHttpServletRequestBuilder> escrituras() {
        MediaType json = MediaType.APPLICATION_JSON;
        return List.of(
            post("/api/bandeja/" + id + "/responder").contentType(json).content("{\"texto\":\"Hola\"}"),
            post("/api/bandeja/" + id + "/pausar"),
            post("/api/bandeja/" + id + "/reanudar"),
            post("/api/bandeja/" + id + "/tomar"),
            post("/api/bandeja/" + id + "/asignar").contentType(json).content("{\"usuarioId\":5}"),
            post("/api/bandeja/" + id + "/cerrar"));
    }

    private List<MockHttpServletRequestBuilder> lecturas() {
        return List.of(get("/api/bandeja"), get("/api/bandeja/resumen"), get("/api/bandeja/equipo"),
            get("/api/bandeja/" + id + "/mensajes"));
    }

    @Test
    void lectorRecibe403EnCadaEscrituraYNoSeEjecutaNada() throws Exception {
        when(guard.esLector(7L)).thenReturn(true);
        MockMvc mvc = mvc();
        for (MockHttpServletRequestBuilder b : escrituras()) {
            mvc.perform(b).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Tu rol de Lector es solo de visualización."));
        }
        verify(service, never()).responder(any(), any(), any());
        verify(service, never()).pausar(any(), any(), any());
        verify(service, never()).reanudar(any(), any(), any());
        verify(service, never()).tomar(any(), any(), any());
        verify(service, never()).asignar(any(), any(), any(), any());
        verify(service, never()).cerrar(any(), any(), any());
        verify(aviso, never()).avisarAsignacion(anyLong(), any());
    }

    @Test
    void lectorPuedeListarYLeer() throws Exception {
        when(guard.esLector(7L)).thenReturn(true);
        MockMvc mvc = mvc();
        for (MockHttpServletRequestBuilder b : lecturas()) {
            mvc.perform(b).andExpect(status().isOk());
        }
    }

    @Test
    void cajeroNoEntraALaBandejaNiParaLeerNiParaEscribir() throws Exception {
        when(guard.esCajero(7L)).thenReturn(true);
        MockMvc mvc = mvc();
        for (MockHttpServletRequestBuilder b : escrituras()) mvc.perform(b).andExpect(status().isForbidden());
        for (MockHttpServletRequestBuilder b : lecturas()) mvc.perform(b).andExpect(status().isForbidden());
        verify(service, never()).cerrar(any(), any(), any());
        verify(service, never()).asignar(any(), any(), any(), any());
    }

    @Test
    void editorYPropietarioSiPuedenEscribir() throws Exception {
        MockMvc mvc = mvc(); // ni LECTOR ni CAJERO
        for (MockHttpServletRequestBuilder b : lecturas()) mvc.perform(b).andExpect(status().isOk());
        mvc.perform(post("/api/bandeja/" + id + "/cerrar")).andExpect(status().isOk());
        verify(service).cerrar(any(), any(), any());
    }

    /** Si alguien excluye /api/bandeja en WebMvcConfig, LECTOR y CAJERO quedarían sin freno: esto lo detecta. */
    @Test
    void laConfiguracionAplicaLosInterceptoresDeRolALaBandeja() {
        SlugTenantInterceptor slug = mock(SlugTenantInterceptor.class);
        WebMvcConfig config = new WebMvcConfig(slug, lector, mock(SuspensionImpagoInterceptor.class),
            mock(SoloPropietarioNegocioInterceptor.class), mock(CajeroSinCatalogoInterceptor.class), cajero);
        Registro registro = new Registro();
        config.addInterceptors(registro);

        for (String ruta : List.of("/api/bandeja", "/api/bandeja/resumen", "/api/bandeja/" + id + "/mensajes",
                "/api/bandeja/" + id + "/responder", "/api/bandeja/" + id + "/asignar", "/api/bandeja/" + id + "/cerrar")) {
            assertThat(aplica(registro, lector, ruta)).as("LECTOR en " + ruta).isTrue();
            assertThat(aplica(registro, cajero, ruta)).as("CAJERO en " + ruta).isTrue();
        }
    }

    private static boolean aplica(Registro registro, Object interceptor, String ruta) {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", ruta);
        ServletRequestPathUtils.parseAndCache(req);
        return registro.todos().stream()
            .filter(MappedInterceptor.class::isInstance).map(MappedInterceptor.class::cast)
            .anyMatch(mi -> mi.getInterceptor() == interceptor && mi.matches(req));
    }

    private static final class Registro extends InterceptorRegistry {
        List<Object> todos() {
            return getInterceptors();
        }
    }
}
