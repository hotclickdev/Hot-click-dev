package com.hotclick.service.alta;

import com.hotclick.catalogo.CatalogoPublicoGate;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.SlugTenantInterceptor;
import com.hotclick.service.EmpresaService;
import com.hotclick.service.catalogo.CatalogoChatSql;
import com.hotclick.service.contacto.ContactoTextoPublico;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("Negocio en borrador (alta por fases): no aparece en marketplace, búsqueda, sitemap, feeds ni páginas públicas")
class AltaFasesVisibilidadFailClosedTest {

    static Empresa empresa(boolean ventaOnline) {
        Empresa e = new Empresa();
        e.setId(9L);
        e.setSlug("soda-esquina");
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setAltaPorFases(true);
        e.setVentaOnlineHabilitada(ventaOnline);
        return e;
    }

    static Producto producto(Empresa e) {
        Producto p = new Producto();
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setEmpresa(e);
        return p;
    }

    @Test
    @DisplayName("TODA consulta de catálogo/búsqueda/sitemap/feed/SEO con visibilidad pública exige venta_online_habilitada")
    void todasLasConsultasPublicasExigenElPredicado() {
        int revisadas = 0;
        for (Class<?> tipo : new Class<?>[] {ProductoRepository.class, EmpresaRepository.class, CategoriaRepository.class, MarcaRepository.class}) {
            for (Method m : tipo.getMethods()) {
                Query q = m.getAnnotation(Query.class);
                if (q == null) continue;
                String sql = q.value() + " " + q.countQuery();
                if (!sql.contains("visibilidad_publica") && !sql.contains("visibilidadPublica")) continue;
                revisadas++;
                assertThat(sql).as(tipo.getSimpleName() + "." + m.getName())
                    .matches("(?s).*(venta_online_habilitada|ventaOnlineHabilitada).*");
            }
        }
        assertThat(revisadas).as("debe haber consultas públicas revisadas").isGreaterThan(15);
        assertThat(CatalogoChatSql.filtroEmpresa(true)).contains("venta_online_habilitada");
        assertThat(ContactoTextoPublico.SQL_NEGOCIO_PRODUCTO).contains("venta_online_habilitada");
        assertThat(CatalogoPublicoGate.SQL_LISTADO).contains("venta_online_habilitada");
        assertThat(CatalogoPublicoGate.JPQL_E).contains("ventaOnlineHabilitada");
    }

    @Test
    @DisplayName("Un producto de un negocio en borrador no es publicable ni comprable (en memoria, mismo criterio que esPublicable)")
    void productoDeBorradorNoEsPublicable() {
        assertThat(StockReservationService.esPublicableEnMemoria(producto(empresa(false)))).isFalse();
        assertThat(StockReservationService.esPublicableEnMemoria(producto(empresa(true)))).isTrue();
        assertThat(CatalogoPublicoGate.empresaPublicable(empresa(false))).isFalse();
        assertThat(CatalogoPublicoGate.empresaPublicable(empresa(true))).isTrue();
    }

    @Test
    @DisplayName("Negocio existente (alta_por_fases=false, venta_online=TRUE por defecto) sigue publicado: nada se apaga")
    void existenteSigueIgual() {
        Empresa legacy = new Empresa();
        legacy.setEstadoEmpresa("ACTIVO");
        legacy.setVisibilidadPublica(true);
        assertThat(legacy.isAltaPorFases()).isFalse();
        assertThat(legacy.isVentaOnlineHabilitada()).isTrue();
        assertThat(StockReservationService.esPublicableEnMemoria(producto(legacy))).isTrue();
    }

    @Test
    @DisplayName("Página pública de la tienda (/api/tienda/{slug}): 404 para un borrador, 200 una vez habilitada")
    void slugDeBorradorEs404() throws Exception {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        SlugTenantInterceptor interceptor = new SlugTenantInterceptor(repo);
        when(repo.findBySlug("soda-esquina")).thenReturn(Optional.of(empresa(false)));
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of("slug", "soda-esquina"));
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertThat(interceptor.preHandle(req, res, new Object())).isFalse();
        assertThat(res.getStatus()).isEqualTo(404);

        when(repo.findBySlug("soda-esquina")).thenReturn(Optional.of(empresa(true)));
        MockHttpServletResponse ok = new MockHttpServletResponse();
        assertThat(interceptor.preHandle(req, ok, new Object())).isTrue();
    }

    @Test
    @DisplayName("Resolver slug → empresa (cupones, etc.) no revela un negocio en borrador")
    void obtenerIdPorSlug() {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        EmpresaService svc = new EmpresaService(repo);
        when(repo.findBySlug("soda-esquina")).thenReturn(Optional.of(empresa(false)));
        assertThat(svc.obtenerIdPorSlug("soda-esquina")).isEmpty();
        when(repo.findBySlug("soda-esquina")).thenReturn(Optional.of(empresa(true)));
        assertThat(svc.obtenerIdPorSlug("soda-esquina")).contains(9L);
    }

    @Test
    @DisplayName("Todas las consultas de pago a nombre del negocio comparten un solo predicado de la entidad")
    void predicadoUnico() {
        assertThat(List.of(Empresa.class.getDeclaredFields()).stream().map(f -> f.getName()))
            .contains("ventaOnlineHabilitada", "altaPorFases");
    }
}
