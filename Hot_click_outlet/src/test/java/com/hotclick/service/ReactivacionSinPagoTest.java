package com.hotclick.service;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.ReactivacionSinPagoException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SancionPlataformaRepository;
import com.hotclick.service.suscripcion.AdminSuspensionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Regla del dueño: SUSPENDIDO_IMPAGO / EXTENSION_IMPAGO solo vuelve a ACTIVO con pago ONVO confirmado. */
@DisplayName("Admin no reactiva una tienda suspendida por impago sin pago")
class ReactivacionSinPagoTest {

    Empresa empresa(String estado) {
        Empresa e = new Empresa();
        e.setId(9L);
        e.setEstadoEmpresa(estado);
        e.setVisibilidadPublica(false);
        return e;
    }

    EmpresaAdminService admin(EmpresaRepository repo, EmpresaAprobacionService aprob) {
        EmpresaAdminService s = new EmpresaAdminService();
        ReflectionTestUtils.setField(s, "empresaRepository", repo);
        ReflectionTestUtils.setField(s, "empresaAprobacionService", aprob);
        ReflectionTestUtils.setField(s, "auditoriaAdminRegistroService", mock(AuditoriaAdminRegistroService.class));
        return s;
    }

    @ParameterizedTest
    @CsvSource({"SUSPENDIDO_IMPAGO,ACTIVO", "SUSPENDIDO_IMPAGO,SUSPENDIDO", "SUSPENDIDO_IMPAGO,INACTIVO",
                "EXTENSION_IMPAGO,ACTIVO", "EXTENSION_IMPAGO,INACTIVO"})
    void cambiarEstadoDesdeImpagoEs409SinEfecto(String desde, String hacia) {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        EmpresaAprobacionService aprob = mock(EmpresaAprobacionService.class);
        Empresa e = empresa(desde);
        when(repo.findById(9L)).thenReturn(Optional.of(e));
        EmpresaAdminService s = admin(repo, aprob);
        assertThrows(ReactivacionSinPagoException.class, () -> s.cambiarEstado(9L, hacia, "motivo de prueba"));
        assertEquals(desde, e.getEstadoEmpresa());
        verify(repo, never()).save(any());
        verifyNoInteractions(aprob);
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUSPENDIDO_IMPAGO", "EXTENSION_IMPAGO"})
    void visibilidadNoSePrendeEnImpago(String estado) {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        Empresa e = empresa(estado);
        when(repo.findById(9L)).thenReturn(Optional.of(e));
        EmpresaAdminService s = admin(repo, mock(EmpresaAprobacionService.class));
        ReflectionTestUtils.setField(s, "sancionRepo", mock(SancionPlataformaRepository.class));
        assertThrows(ReactivacionSinPagoException.class, () -> s.cambiarVisibilidad(9L, true));
        assertFalse(e.getVisibilidadPublica());
        verify(repo, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUSPENDIDO_IMPAGO", "EXTENSION_IMPAGO"})
    void aprobarYPublicarNoReactivaImpago(String estado) {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        ProductoRepository prod = mock(ProductoRepository.class);
        Empresa e = empresa(estado);
        when(repo.findById(9L)).thenReturn(Optional.of(e));
        EmpresaAprobacionService a = new EmpresaAprobacionService();
        ReflectionTestUtils.setField(a, "empresaRepository", repo);
        ReflectionTestUtils.setField(a, "productoRepository", prod);
        assertThrows(ReactivacionSinPagoException.class, () -> a.aprobarYPublicar(9L));
        assertEquals(estado, e.getEstadoEmpresa());
        verify(repo, never()).save(any());
        verifyNoInteractions(prod);
    }

    @Test
    void handlerResponde409ConCodigo() {
        ResponseEntity<ResponseDTO> r = new GlobalExceptionHandler()
            .handleReactivacionSinPago(new ReactivacionSinPagoException());
        assertEquals(409, r.getStatusCode().value());
        assertEquals(Map.of("codigo", "REACTIVACION_REQUIERE_PAGO"), r.getBody().getData());
    }

    @ParameterizedTest
    @CsvSource({"-5,1", "0,1", "1,1", "50,50", "200,200", "100000,200"})
    void limitDeListaAcotado(int pedido, int esperado) {
        assertEquals(esperado, AdminSuspensionService.acotar(pedido));
    }

    @Test
    @SuppressWarnings("unchecked")
    void listarSinNMasUno() {
        EmpresaRepository er = mock(EmpresaRepository.class);
        com.hotclick.repository.SuscripcionRepository sr = mock(com.hotclick.repository.SuscripcionRepository.class);
        com.hotclick.repository.SuspensionExtensionRepository xr = mock(com.hotclick.repository.SuspensionExtensionRepository.class);
        java.util.List<Object[]> filas = new java.util.ArrayList<>();
        for (long id = 1; id <= 30; id++) filas.add(new Object[]{id, "T" + id, id == 2 ? "EXTENSION_IMPAGO" : "SUSPENDIDO_IMPAGO"});
        when(er.findResumenByEstados(any(), any())).thenReturn(filas);
        Empresa e1 = new Empresa(); e1.setId(1L);
        com.hotclick.model.Suscripcion c1 = new com.hotclick.model.Suscripcion();
        ReflectionTestUtils.setField(c1, "id", 100L); c1.setEmpresa(e1);
        Empresa e3 = new Empresa(); e3.setId(3L);
        com.hotclick.model.Suscripcion c3 = new com.hotclick.model.Suscripcion();
        ReflectionTestUtils.setField(c3, "id", 300L); c3.setEmpresa(e3);
        when(sr.findByEmpresaIdsAndEstado(any(), eq("VENCIDO"))).thenReturn(java.util.List.of(c1, c3));
        when(xr.findSuscripcionIdsUsadas(any())).thenReturn(java.util.List.of(300L));
        AdminSuspensionService svc = new AdminSuspensionService(er, sr, xr, mock(com.hotclick.repository.PedidoRepository.class),
            null, mock(AuditoriaAdminRegistroService.class),
            mock(com.hotclick.security.CompanyScope.class), 8, 3);
        java.util.List<Map<String, Object>> l = (java.util.List<Map<String, Object>>) svc.listar(-3).get("suspendidas");
        assertEquals(30, l.size());
        assertEquals(true, l.get(0).get("extensionDisponible"));   // ciclo 100 sin extensión
        assertEquals(false, l.get(2).get("extensionDisponible"));  // ciclo 300 ya usada
        assertEquals(false, l.get(3).get("extensionDisponible"));  // sin ciclo: fail-closed
        assertEquals("T5", l.get(4).get("nombreEmpresa"));
        // consultas fijas, sin importar cuántas tiendas haya
        verify(er, times(1)).findResumenByEstados(any(), argThat(p -> p.getPageSize() == 1));
        verify(sr, times(1)).findByEmpresaIdsAndEstado(any(), any());
        verify(xr, times(1)).findSuscripcionIdsUsadas(any());
        verify(xr, times(1)).findByEmpresaIdsRecientes(any());
        verify(er, never()).findById(anyLong());
        verify(sr, never()).findTopByEmpresaIdAndEstadoOrderByFechaCreacionDesc(anyLong(), any());
        verify(xr, never()).existsBySuscripcionId(anyLong());
    }
}
