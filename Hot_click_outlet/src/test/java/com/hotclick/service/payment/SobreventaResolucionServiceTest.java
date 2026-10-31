package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Seguimiento MED-2: salida de REVISION_SOBREVENTA")
class SobreventaResolucionServiceTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private PedidoGrupoService pedidoGrupoService;
    @Mock private AuditoriaAdminRegistroService auditoria;
    @Mock private CompanyScope companyScope;
    @InjectMocks private SobreventaResolucionService service;

    private Pedido pedido;
    private Pago pago;

    @BeforeEach
    void armar() {
        pedido = new Pedido();
        pedido.setId(7L);
        pedido.setNumeroPedido("HC-SV-7");
        pedido.setEstadoPedido(Constants.PEDIDO_REVISION_SOBREVENTA);
        pago = new Pago();
        pago.setId(70L);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        when(companyScope.isAdminIT()).thenReturn(true);
        when(companyScope.isImpersonating()).thenReturn(false);
        when(pedidoRepository.findById(7L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.estadosDe(any())).thenAnswer(inv -> List.of(pedido.getEstadoPedido()));
        when(pedidoGrupoService.delGrupo(pedido)).thenReturn(List.of(pedido));
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.of(pago));
        when(pagoRepository.findByIdForUpdate(70L)).thenReturn(Optional.of(pago));
    }

    @Test
    @DisplayName("CANCELAR → CANCELADO, el reembolso sigue pendiente, auditado con motivo")
    void cancelar() {
        service.resolver(7L, "cancelar", "cliente no quiere esperar");

        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(pagoRepository, never()).save(any());
        verify(auditoria).registrar(eq("SOBREVENTA_CANCELAR"), eq("PEDIDO"), eq(7L), any(),
            contains("motivo: cliente no quiere esperar"));
    }

    @Test
    @DisplayName("REEMBOLSO_PROCESADO → pago REEMBOLSADO y pedido CANCELADO (sin llamar al procesador)")
    void reembolsoProcesado() {
        service.resolver(7L, "REEMBOLSO_PROCESADO", "reembolsado por transferencia");

        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(pagoRepository).save(pago);
        verify(auditoria).registrar(eq("SOBREVENTA_REEMBOLSO_PROCESADO"), anyString(), anyLong(), any(),
            contains("REEMBOLSADO"));
    }

    @Test
    @DisplayName("no ADMIN → 403 sin tocar nada")
    void noAdmin() {
        when(companyScope.isAdminIT()).thenReturn(false);
        assertThatThrownBy(() -> service.resolver(7L, "CANCELAR", "x")).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(pedidoRepository, pagoRepository, auditoria);
    }

    @Test
    @DisplayName("ADMIN impersonando a un negocio → 403")
    void impersonando() {
        when(companyScope.isImpersonating()).thenReturn(true);
        assertThatThrownBy(() -> service.resolver(7L, "CANCELAR", "x")).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("pedido que no está en revisión (p. ej. PAGADO) → 400, transición inválida")
    void noEnRevision() {
        pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
        assertThatThrownBy(() -> service.resolver(7L, "CANCELAR", "x"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(SobreventaResolucionService.MENSAJE_NO_EN_REVISION);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
    }

    @Test
    @DisplayName("acción desconocida (p. ej. PAGADO o ENVIADO) → 400")
    void accionInvalida() {
        for (String accion : new String[]{"PAGADO", "ENVIADO", "", null}) {
            assertThatThrownBy(() -> service.resolver(7L, accion, "x")).isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_REVISION_SOBREVENTA);
    }

    @Test
    @DisplayName("sin motivo o motivo largo → 400")
    void motivoObligatorio() {
        assertThatThrownBy(() -> service.resolver(7L, "CANCELAR", "  ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.resolver(7L, "CANCELAR", "a".repeat(501))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("REEMBOLSO_PROCESADO con pago que no está pendiente → 400")
    void reembolsoSinPendiente() {
        pago.setEstadoPago(Constants.PAGO_REEMBOLSADO);
        assertThatThrownBy(() -> service.resolver(7L, "REEMBOLSO_PROCESADO", "x"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_REVISION_SOBREVENTA);
    }

    @Test
    @DisplayName("bloquea pago y luego pedido (mismo orden que el webhook) y relee el estado ya con lock")
    void leeConLock() {
        service.resolver(7L, "REEMBOLSO_PROCESADO", "transferencia");
        org.mockito.InOrder orden = org.mockito.Mockito.inOrder(pagoRepository, pedidoRepository);
        orden.verify(pagoRepository).findByIdForUpdate(70L);
        orden.verify(pedidoRepository).findByIdForUpdate(7L);
        orden.verify(pedidoRepository).estadosDe(List.of(7L));
    }

    @Test
    @DisplayName("la copia sin lock dice REVISION pero la base ya cambió (otro admin): 400 sin tocar el pago")
    void estadoReleidoConLock_mandaSobreLaCopia() {
        when(pedidoRepository.estadosDe(any())).thenReturn(List.of(Constants.PEDIDO_CANCELADO));
        assertThatThrownBy(() -> service.resolver(7L, "REEMBOLSO_PROCESADO", "transferencia"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(SobreventaResolucionService.MENSAJE_NO_EN_REVISION);
        verify(pagoRepository, never()).save(any());
        verifyNoInteractions(auditoria);
    }

    @Test
    @DisplayName("segundo ADMIN que espera el lock ve el pedido ya CANCELADO → 400, sin doble marca")
    void segundoAdmin_veResuelto() {
        service.resolver(7L, "REEMBOLSO_PROCESADO", "transferencia");
        org.mockito.Mockito.clearInvocations(pagoRepository, auditoria);
        assertThatThrownBy(() -> service.resolver(7L, "REEMBOLSO_PROCESADO", "otra vez"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(SobreventaResolucionService.MENSAJE_NO_EN_REVISION);
        verify(pagoRepository, never()).save(any());
        verifyNoInteractions(auditoria);
    }

    // PR #460 (M2): pago compartido que sigue CAPTURADO por los paquetes confirmados.
    private Pedido confirmadoDelMismoPago() {
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMoneda("CRC");
        pago.setMontoReembolsoPendiente(3000);
        Pedido confirmado = new Pedido();
        confirmado.setId(8L);
        confirmado.setNumeroPedido("HC-SV-8");
        confirmado.setEstadoPedido(Constants.PEDIDO_PAGADO);
        when(pedidoGrupoService.delGrupo(pedido)).thenReturn(List.of(pedido, confirmado));
        return confirmado;
    }

    @Test
    @DisplayName("cobro parcial + CANCELAR: el paquete se cancela, el pago sigue CAPTURADO y el parcial sigue pendiente")
    void cobroParcial_cancelar_noTocaPagoEntero() {
        Pedido confirmado = confirmadoDelMismoPago();

        service.resolver(7L, "CANCELAR", "sin stock");

        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(confirmado.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(pago.getMontoReembolsoPendiente()).isEqualTo(3000);
        verify(pagoRepository, never()).save(any());
        verify(auditoria).registrar(eq("SOBREVENTA_CANCELAR"), any(), any(), any(),
            contains("reembolso parcial pendiente 3000"));
    }

    @Test
    @DisplayName("cobro parcial + REEMBOLSO_PROCESADO: el parcial pasa a devuelto, el pago NO queda REEMBOLSADO entero")
    void cobroParcial_reembolsoProcesado_soloParcial() {
        Pedido confirmado = confirmadoDelMismoPago();

        service.resolver(7L, "REEMBOLSO_PROCESADO", "transferencia parcial");

        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(pago.getMontoReembolsoPendiente()).isZero();
        assertThat(pago.getMontoReembolsado()).isEqualTo(3000);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(confirmado.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
        verify(pagoRepository).save(pago);
    }

    @Test
    @DisplayName("pago CAPTURADO sin parcial pendiente + REEMBOLSO_PROCESADO → 400, nada cambia")
    void capturadoSinParcial_reembolsoProcesado_400() {
        confirmadoDelMismoPago();
        pago.setMontoReembolsoPendiente(0);
        assertThatThrownBy(() -> service.resolver(7L, "REEMBOLSO_PROCESADO", "x"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(SobreventaResolucionService.MENSAJE_PAGO_NO_PENDIENTE);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        verify(pagoRepository, never()).save(any());
    }
}
