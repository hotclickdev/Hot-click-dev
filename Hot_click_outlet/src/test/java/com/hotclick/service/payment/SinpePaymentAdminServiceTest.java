package com.hotclick.service.payment;

import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PagoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.sinpe.SinpeAprobacionGuard;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SinpePaymentAdminServiceTest {

    @Mock private PagoRepository pagoRepository;
    @Mock private PaymentOrderConfirmationService orderConfirmationService;
    @Mock private PaymentFailureHandler paymentFailureHandler;
    @Mock private PaymentStatusAssembler paymentStatusAssembler;
    @Mock private CompanyScope companyScope;

    private SinpePaymentAdminService service;

    @BeforeEach
    void setUp() {
        SinpeAprobacionGuard guard = new SinpeAprobacionGuard();
        ReflectionTestUtils.setField(guard, "companyScope", companyScope);
        service = new SinpePaymentAdminService();
        ReflectionTestUtils.setField(service, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(service, "orderConfirmationService", orderConfirmationService);
        ReflectionTestUtils.setField(service, "paymentFailureHandler", paymentFailureHandler);
        ReflectionTestUtils.setField(service, "paymentStatusAssembler", paymentStatusAssembler);
        ReflectionTestUtils.setField(service, "aprobacionGuard", guard);
    }

    @AfterEach
    void limpiarSesion() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void vendedorDeOtraEmpresa_noConfirmaNiRechaza() {
        Pago pago = pagoSinpe(5L, 9L, "comprador@test.com");
        when(pagoRepository.findById(10L)).thenReturn(Optional.of(pago));
        actor("otra@test.com", 4L, 8L, false);

        assertThrows(SecurityException.class, () -> service.confirmarSinpe(10L, null, null));
        assertThrows(SecurityException.class, () -> service.rechazarSinpe(10L, "no"));

        verify(orderConfirmationService, never()).confirmarPedido(any(), any(), any());
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
        assertEquals(Constants.PAGO_PENDIENTE, pago.getEstadoPago());
    }

    @Test
    void compradorQueTambienEsVendedor_noApruebaSuCompra() {
        Pago pago = pagoSinpe(5L, 3L, "tienda@test.com");
        when(pagoRepository.findById(10L)).thenReturn(Optional.of(pago));
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("tienda@test.com", "n/a"));
        when(companyScope.getCurrentUserId()).thenReturn(3L);

        SecurityException ex = assertThrows(SecurityException.class,
            () -> service.confirmarSinpe(10L, null, null));

        assertEquals("No tienes permiso para aprobar tu propia compra", ex.getMessage());
        verify(orderConfirmationService, never()).confirmarPedido(any(), any(), any());
    }

    @Test
    void vendedor_pagoInexistente_noEs404() {
        when(pagoRepository.findById(99L)).thenReturn(Optional.empty());
        when(companyScope.isAdminIT()).thenReturn(false);

        assertThrows(SecurityException.class, () -> service.confirmarSinpe(99L, null, null));
        verify(orderConfirmationService, never()).confirmarPedido(any(), any(), any());
    }

    @Test
    void admin_pagoInexistente_sigueSiendo404() {
        when(pagoRepository.findById(99L)).thenReturn(Optional.empty());
        when(companyScope.isAdminIT()).thenReturn(true);

        assertThrows(RecursoNoEncontradoException.class, () -> service.rechazarSinpe(99L, "x"));
    }

    @Test
    void duenoDeLaTienda_confirmaCompraAjena() {
        Pago pago = pagoSinpe(5L, 9L, "comprador@test.com");
        when(pagoRepository.findById(10L)).thenReturn(Optional.of(pago));
        when(paymentStatusAssembler.build(pago)).thenReturn(new PaymentStatusResponse());
        actor("tienda@test.com", 3L, 5L, false);

        service.confirmarSinpe(10L, service, null);

        assertEquals(Constants.PAGO_CAPTURADO, pago.getEstadoPago());
        verify(orderConfirmationService).confirmarPedido(pago, service, null);
    }

    private void actor(String correo, Long userId, Long empresaId, boolean admin) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(correo, "n/a"));
        when(companyScope.getCurrentUserId()).thenReturn(userId);
        when(companyScope.isAdminIT()).thenReturn(admin);
        when(companyScope.getCurrentEmpresaId()).thenReturn(empresaId);
    }

    private static Pago pagoSinpe(Long empresaId, Long compradorId, String correo) {
        Empresa empresa = new Empresa();
        empresa.setId(empresaId);
        Usuario comprador = new Usuario();
        comprador.setId(compradorId);
        comprador.setCorreo(correo);
        Pedido pedido = new Pedido();
        pedido.setEmpresa(empresa);
        pedido.setUsuarioFinal(comprador);
        pedido.setNumeroPedido("ORD-SINPE");
        Pago pago = new Pago();
        pago.setId(10L);
        pago.setPedido(pedido);
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        return pago;
    }
}
