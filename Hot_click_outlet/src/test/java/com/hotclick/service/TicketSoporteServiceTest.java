package com.hotclick.service;

import com.hotclick.dto.TicketSoporteUpdateRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.TicketSoporte;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TicketSoporteRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TicketSoporteService — inbox admin listar/asignar/resolver")
class TicketSoporteServiceTest {

    @Mock TicketSoporteRepository ticketRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock CompanyScope companyScope;
    @Mock InputSanitizer sanitizer;
    @Mock ResendEmailService emailService;
    @InjectMocks TicketSoporteService service;

    private Empresa empresaA;
    private Empresa empresaB;
    private Usuario admin;
    private Usuario vendedor;

    @BeforeEach
    void setUp() {
        empresaA = new Empresa();
        empresaA.setId(10L);
        empresaA.setNombreEmpresa("Tienda A");
        empresaA.setSlug("tienda-a");

        empresaB = new Empresa();
        empresaB.setId(20L);
        empresaB.setNombreEmpresa("Tienda B");
        empresaB.setSlug("tienda-b");

        admin = new Usuario();
        admin.setId(1L);
        admin.setNombre("Admin IT");
        admin.setCorreo("admin@hotclick.lat");

        vendedor = new Usuario();
        vendedor.setId(5L);
        vendedor.setNombre("Vendedor");
        vendedor.setCorreo("vende@tienda.cr");
    }

    @Test
    void listarAdmin_sinSerAdmin_rechaza() {
        when(companyScope.isAdminIT()).thenReturn(false);

        assertThatThrownBy(() -> service.listarAdmin(null, null))
            .isInstanceOf(TenantAccessDeniedException.class);
        verify(ticketRepo, never()).findAdminFiltrado(any(), any());
    }

    @Test
    void actualizar_sinSerAdmin_rechaza() {
        when(companyScope.isAdminIT()).thenReturn(false);
        TicketSoporteUpdateRequest req = new TicketSoporteUpdateRequest();
        req.setAccion("ASIGNAR");

        assertThatThrownBy(() -> service.actualizarAdmin(7L, req))
            .isInstanceOf(TenantAccessDeniedException.class);
        verify(ticketRepo, never()).findById(any());
        verify(ticketRepo, never()).save(any());
    }

    @Test
    void listarAdmin_sinFiltroEmpresa_adminVeTodos() {
        when(companyScope.isAdminIT()).thenReturn(true);
        when(ticketRepo.findAdminFiltrado(isNull(), isNull())).thenReturn(List.of(
            ticket(1L, empresaA, TicketSoporte.ABIERTO),
            ticket(2L, empresaB, TicketSoporte.ASIGNADO)));

        List<Map<String, Object>> out = service.listarAdmin(null, null);

        assertThat(out).hasSize(2);
        assertThat(out).extracting(m -> m.get("empresaId")).containsExactly(10L, 20L);
        verify(ticketRepo).findAdminFiltrado(null, null);
    }

    @Test
    void listarAdmin_filtraPorEmpresa_aislamiento() {
        when(companyScope.isAdminIT()).thenReturn(true);
        TicketSoporte soloA = ticket(100L, empresaA, TicketSoporte.ABIERTO);
        when(ticketRepo.findAdminFiltrado(eq(10L), isNull())).thenReturn(List.of(soloA));

        List<Map<String, Object>> out = service.listarAdmin(10L, null);

        assertThat(out).hasSize(1);
        assertThat(out.get(0).get("empresaId")).isEqualTo(10L);
        assertThat(out.get(0).get("id")).isEqualTo(100L);
        verify(ticketRepo).findAdminFiltrado(10L, null);
        verify(ticketRepo, never()).findAdminFiltrado(eq(20L), any());
    }

    @Test
    void listarAdmin_filtraPorEstado() {
        when(companyScope.isAdminIT()).thenReturn(true);
        when(ticketRepo.findAdminFiltrado(isNull(), eq(TicketSoporte.ABIERTO)))
            .thenReturn(List.of(ticket(1L, empresaA, TicketSoporte.ABIERTO)));

        List<Map<String, Object>> out = service.listarAdmin(null, "abierto");

        assertThat(out).hasSize(1);
        assertThat(out.get(0).get("estado")).isEqualTo(TicketSoporte.ABIERTO);
        verify(ticketRepo).findAdminFiltrado(null, TicketSoporte.ABIERTO);
    }

    @Test
    void listarAdmin_estadoInvalido_rechaza() {
        when(companyScope.isAdminIT()).thenReturn(true);

        assertThatThrownBy(() -> service.listarAdmin(null, "CERRADO"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Estado");
    }

    @Test
    void asignar_ok_asignaAdminActual() {
        when(companyScope.isAdminIT()).thenReturn(true);
        when(companyScope.getCurrentUser()).thenReturn(admin);
        TicketSoporte t = ticket(7L, empresaA, TicketSoporte.ABIERTO);
        when(ticketRepo.findById(7L)).thenReturn(Optional.of(t));
        when(ticketRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TicketSoporteUpdateRequest req = new TicketSoporteUpdateRequest();
        req.setAccion("ASIGNAR");
        Map<String, Object> out = service.actualizarAdmin(7L, req);

        assertThat(out.get("estado")).isEqualTo(TicketSoporte.ASIGNADO);
        assertThat(out.get("asignadoId")).isEqualTo(1L);
        assertThat(t.getFechaAsignacion()).isNotNull();
    }

    @Test
    void resolver_ok_marcaResuelto() {
        when(companyScope.isAdminIT()).thenReturn(true);
        when(sanitizer.cleanWithLimit(any(), org.mockito.ArgumentMatchers.anyInt()))
            .thenAnswer(inv -> inv.getArgument(0));
        TicketSoporte t = ticket(8L, empresaA, TicketSoporte.ASIGNADO);
        t.setAsignado(admin);
        when(ticketRepo.findById(8L)).thenReturn(Optional.of(t));
        when(ticketRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TicketSoporteUpdateRequest req = new TicketSoporteUpdateRequest();
        req.setAccion("RESOLVER");
        req.setNotasAdmin("Listo, reiniciá sesión");
        Map<String, Object> out = service.actualizarAdmin(8L, req);

        assertThat(out.get("estado")).isEqualTo(TicketSoporte.RESUELTO);
        assertThat(out.get("notasAdmin")).isEqualTo("Listo, reiniciá sesión");
        assertThat(t.getFechaResolucion()).isNotNull();
    }

    @Test
    void resolver_yaResuelto_rechaza() {
        when(companyScope.isAdminIT()).thenReturn(true);
        TicketSoporte t = ticket(9L, empresaA, TicketSoporte.RESUELTO);
        when(ticketRepo.findById(9L)).thenReturn(Optional.of(t));

        TicketSoporteUpdateRequest req = new TicketSoporteUpdateRequest();
        req.setAccion("RESOLVER");

        assertThatThrownBy(() -> service.actualizarAdmin(9L, req))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ya está resuelto");
        verify(ticketRepo, never()).save(any());
    }

    @Test
    void actualizar_accionInvalida_rechaza() {
        when(companyScope.isAdminIT()).thenReturn(true);
        TicketSoporteUpdateRequest req = new TicketSoporteUpdateRequest();
        req.setAccion("BORRAR");

        assertThatThrownBy(() -> service.actualizarAdmin(1L, req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Acción");
        verify(ticketRepo, never()).findById(any());
    }

    @Test
    void actualizar_inexistente_404() {
        when(companyScope.isAdminIT()).thenReturn(true);
        when(ticketRepo.findById(99L)).thenReturn(Optional.empty());
        TicketSoporteUpdateRequest req = new TicketSoporteUpdateRequest();
        req.setAccion("ASIGNAR");

        assertThatThrownBy(() -> service.actualizarAdmin(99L, req))
            .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void crear_asociaEmpresaDelVendedor() {
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(10L);
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresaA));
        when(companyScope.getCurrentUser()).thenReturn(vendedor);
        when(sanitizer.cleanWithLimit(any(), org.mockito.ArgumentMatchers.anyInt()))
            .thenAnswer(inv -> inv.getArgument(0));
        when(ticketRepo.save(any())).thenAnswer(inv -> {
            TicketSoporte t = inv.getArgument(0);
            t.setId(50L);
            return t;
        });

        Map<String, Object> out = service.crear("No carga", "El POS se queda en blanco", null);

        ArgumentCaptor<TicketSoporte> cap = ArgumentCaptor.forClass(TicketSoporte.class);
        verify(ticketRepo).save(cap.capture());
        assertThat(cap.getValue().getEmpresa().getId()).isEqualTo(10L);
        assertThat(out.get("empresaId")).isEqualTo(10L);
        assertThat(out.get("estado")).isEqualTo(TicketSoporte.ABIERTO);
    }

    private TicketSoporte ticket(Long id, Empresa empresa, String estado) {
        TicketSoporte t = new TicketSoporte();
        t.setId(id);
        t.setEmpresa(empresa);
        t.setUsuario(vendedor);
        t.setTitulo("Ayuda");
        t.setDescripcion("Detalle");
        t.setEstado(estado);
        return t;
    }
}
