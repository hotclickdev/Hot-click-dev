package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Trial Emprendedor: captura de la tarjeta (estado y datos para el SDK de ONVO)")
class TrialTarjetaServiceTest {

    @Mock EmpresaRepository empresaRepo;
    @Mock SuscripcionRepository suscripcionRepo;
    @Mock OnvoBillingClient onvoBilling;
    @Mock OnvoService onvoService;
    @Mock SuscripcionOnvoChangeService changeService;

    TrialTarjetaService service;
    Empresa empresa;

    @BeforeEach
    void setUp() {
        service = new TrialTarjetaService(empresaRepo, suscripcionRepo, onvoBilling, onvoService, changeService);
        empresa = new Empresa();
        empresa.setId(10L);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setTrialEmprendedorPos(3);
        empresa.setTrialEmprendedorHasta(LocalDate.now(Constants.ZONA_CR).plusDays(40));
        lenient().when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        lenient().when(onvoService.getPublishableKey()).thenReturn("pk_test_x");
    }

    private Suscripcion subOnvo(String id) {
        Suscripcion s = new Suscripcion();
        s.setOnvoSubscriptionId(id);
        return s;
    }

    @Test
    @DisplayName("TRIAL vigente sin suscripción ONVO: elegible, sin tarjeta, con los días que faltan")
    void trialSinSuscripcion() {
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
        TrialTarjetaService.Estado e = service.estado(10L);
        assertThat(e.elegible()).isTrue();
        assertThat(e.tarjetaGuardada()).isFalse();
        assertThat(e.trialDias()).isEqualTo(40);
        verifyNoInteractions(onvoBilling);
    }

    @Test
    @DisplayName("ONVO en trialing sin paymentMethodId: no hay tarjeta")
    void sinPaymentMethod() {
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(subOnvo("sub_1")));
        Map<String, Object> onvo = new HashMap<>();
        onvo.put("status", "trialing");
        onvo.put("paymentMethodId", null);
        doReturn(onvo).when(onvoBilling).obtenerSuscripcion("sub_1");
        assertThat(service.estado(10L).tarjetaGuardada()).isFalse();
    }

    @Test
    @DisplayName("ONVO con paymentMethodId: tarjeta guardada")
    void conPaymentMethod() {
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(subOnvo("sub_1")));
        doReturn(Map.of("status", "trialing", "paymentMethodId", "pm_abc")).when(onvoBilling).obtenerSuscripcion("sub_1");
        assertThat(service.estado(10L).tarjetaGuardada()).isTrue();
    }

    @Test
    @DisplayName("Fail-closed: si ONVO falla no se afirma nada sobre la tarjeta (ni «guardada» ni «sin tarjeta»)")
    void onvoFalla() {
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(subOnvo("sub_1")));
        when(onvoBilling.obtenerSuscripcion("sub_1")).thenThrow(new IllegalStateException("ONVO no está configurado"));
        assertThatThrownBy(() -> service.estado(10L))
            .isInstanceOf(TrialTarjetaService.VerificacionNoDisponibleException.class)
            .hasMessageNotContaining("ONVO no está configurado");
    }

    @ParameterizedTest(name = "estado del plan {0} no es elegible")
    @ValueSource(strings = {"PENDIENTE_CUPO", "REQUIERE_MEMBRESIA", "PAST_DUE", "VENCIDO", "ACTIVO", "PRUEBA_CERRADA"})
    void planNoTrialNoElegible(String estadoPlan) {
        empresa.setEstadoPlan(estadoPlan);
        assertThat(service.estado(10L).elegible()).isFalse();
        assertThatThrownBy(() -> service.iniciar(10L)).isInstanceOf(TrialTarjetaService.NoDisponibleException.class);
        verifyNoInteractions(changeService, onvoBilling);
    }

    @ParameterizedTest(name = "estado de empresa {0} no es elegible")
    @ValueSource(strings = {"PENDIENTE_APROBACION", "SUSPENDIDO_IMPAGO", "EXTENSION_IMPAGO"})
    void empresaNoVigenteNoElegible(String estadoEmpresa) {
        empresa.setEstadoEmpresa(estadoEmpresa);
        assertThat(service.estado(10L).elegible()).isFalse();
        assertThatThrownBy(() -> service.iniciar(10L)).isInstanceOf(TrialTarjetaService.NoDisponibleException.class);
        verifyNoInteractions(changeService);
    }

    @Test
    @DisplayName("Sin puesto de trial, trial vencido o empresa inexistente: no elegible, mismo resultado para todos")
    void otrosNoElegibles() {
        empresa.setTrialEmprendedorPos(null);
        assertThatThrownBy(() -> service.iniciar(10L)).isInstanceOf(TrialTarjetaService.NoDisponibleException.class);
        empresa.setTrialEmprendedorPos(3);
        empresa.setTrialEmprendedorHasta(LocalDate.now(Constants.ZONA_CR).minusDays(1));
        assertThatThrownBy(() -> service.iniciar(10L)).isInstanceOf(TrialTarjetaService.NoDisponibleException.class);
        when(empresaRepo.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.iniciar(99L)).isInstanceOf(TrialTarjetaService.NoDisponibleException.class);
        assertThat(service.estado(99L).elegible()).isFalse();
        verifyNoInteractions(changeService);
    }

    @Test
    @DisplayName("iniciar: devuelve lo que el SDK necesita y no toca el estado del negocio")
    void iniciarDevuelveDatosDelSdk() {
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
        when(changeService.asegurarSuscripcionTrial(10L))
            .thenReturn(new SuscripcionOnvoChangeService.SuscripcionTrial("cus_1", "sub_1", false));

        Map<String, Object> out = service.iniciar(10L);

        assertThat(out).containsEntry("status", "requiere_tarjeta")
            .containsEntry("subscriptionId", "sub_1")
            .containsEntry("customerId", "cus_1")
            .containsEntry("publishableKey", "pk_test_x")
            .containsEntry("trialDias", 40L);
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        verify(empresaRepo, never()).save(any());
    }

    @Test
    @DisplayName("iniciar con tarjeta ya guardada: no abre el SDK ni prepara nada")
    void iniciarConTarjetaYaGuardada() {
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(subOnvo("sub_1")));
        doReturn(Map.of("paymentMethodId", "pm_abc")).when(onvoBilling).obtenerSuscripcion("sub_1");
        Map<String, Object> out = service.iniciar(10L);
        assertThat(out).containsEntry("status", "tarjeta_guardada");
        assertThat(out).doesNotContainKeys("subscriptionId", "publishableKey");
        verifyNoInteractions(changeService);
    }

    @Test
    @DisplayName("iniciar en modo simulado (dev/test): status mock, sin ids ni llave")
    void iniciarMock() {
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
        when(changeService.asegurarSuscripcionTrial(10L))
            .thenReturn(new SuscripcionOnvoChangeService.SuscripcionTrial(null, null, true));
        Map<String, Object> out = service.iniciar(10L);
        assertThat(out).containsEntry("status", "mock").containsEntry("mock", true);
        assertThat(out).doesNotContainKeys("subscriptionId", "publishableKey");
    }

    @Test
    @DisplayName("Si el cambio de estado falla (p. ej. trial de 0 días), responde el mismo «no disponible» uniforme")
    void estadoInvalidoSeUniforma() {
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
        when(changeService.asegurarSuscripcionTrial(10L)).thenThrow(new IllegalStateException("detalle interno"));
        assertThatThrownBy(() -> service.iniciar(10L))
            .isInstanceOf(TrialTarjetaService.NoDisponibleException.class)
            .hasMessageNotContaining("detalle interno");
    }

    @Test
    @DisplayName("tienePaymentMethod ignora nulos, vacíos y el literal «null»")
    void tienePaymentMethod() {
        assertThat(TrialTarjetaService.tienePaymentMethod(null)).isFalse();
        assertThat(TrialTarjetaService.tienePaymentMethod(Map.of())).isFalse();
        assertThat(TrialTarjetaService.tienePaymentMethod(Map.of("paymentMethodId", " "))).isFalse();
        assertThat(TrialTarjetaService.tienePaymentMethod(Map.of("paymentMethodId", "null"))).isFalse();
        assertThat(TrialTarjetaService.tienePaymentMethod(Map.of("paymentMethodId", "pm_1"))).isTrue();
    }
}
