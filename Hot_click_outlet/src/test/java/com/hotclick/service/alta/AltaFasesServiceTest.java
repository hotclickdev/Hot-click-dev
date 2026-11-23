package com.hotclick.service.alta;

import com.hotclick.exception.AltaFasesException;
import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.alta.AltaFasesService.Fase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.CacheManager;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Alta por fases: fases, aprobación fail-closed y cobro en línea")
class AltaFasesServiceTest {

    EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
    EmpresaCuentaOnvoRepository cuentaRepo = mock(EmpresaCuentaOnvoRepository.class);
    ProductoRepository productoRepo = mock(ProductoRepository.class);
    @SuppressWarnings("unchecked")
    ObjectProvider<CacheManager> caches = mock(ObjectProvider.class);
    AltaFasesService svc;

    @BeforeEach
    void setUp() {
        svc = new AltaFasesService(empresaRepo, cuentaRepo, productoRepo, caches, true);
    }

    static Empresa empresa(boolean porFases, String estado, boolean venta) {
        Empresa e = new Empresa();
        e.setId(5L);
        e.setAltaPorFases(porFases);
        e.setEstadoEmpresa(estado);
        e.setVentaOnlineHabilitada(venta);
        return e;
    }

    static EmpresaCuentaOnvo cuenta(String estado, boolean conId) {
        EmpresaCuentaOnvo c = new EmpresaCuentaOnvo();
        c.setEmpresaId(5L);
        c.setEstado(estado);
        if (conId) c.setOnvoAccountId("ca_test_1");
        return c;
    }

    @Test
    @DisplayName("Fases: registro → productos → ONVO → revisión HotClick → publicada; negocio existente no tiene fase")
    void transicionesDeFase() {
        assertThat(AltaFasesService.faseDe(true, "PENDIENTE_APROBACION", false, false, 0)).isEqualTo(Fase.PRODUCTOS);
        assertThat(AltaFasesService.faseDe(true, "PENDIENTE_APROBACION", false, false, 3)).isEqualTo(Fase.ONVO);
        assertThat(AltaFasesService.faseDe(true, "PENDIENTE_APROBACION", false, true, 3)).isEqualTo(Fase.REVISION_HOTCLICK);
        assertThat(AltaFasesService.faseDe(true, "ACTIVO", true, true, 3)).isEqualTo(Fase.PUBLICADA);
        // aprobada pero perdió la cuenta: vuelve a la fase ONVO (a corregir), no se muestra como publicada
        assertThat(AltaFasesService.faseDe(true, "ACTIVO", false, false, 3)).isEqualTo(Fase.ONVO);
        assertThat(AltaFasesService.faseDe(false, "ACTIVO", true, false, 3)).isNull();
        assertThat(AltaFasesService.faseDe(true, "SUSPENDIDO", false, false, 3)).isNull();
        assertThat(Fase.PUBLICADA.numero()).isEqualTo(5);
    }

    @Test
    @DisplayName("Regla de venta en línea: ACTIVA habilita; nuevo sin cuenta activa no vende; existente solo se bloquea si perdió una cuenta")
    void ventaOnlineEsperada() {
        assertThat(AltaFasesService.ventaOnlineEsperada(true, cuenta("ACTIVA", true))).isTrue();
        assertThat(AltaFasesService.ventaOnlineEsperada(true, cuenta("EN_APROBACION", true))).isFalse();
        assertThat(AltaFasesService.ventaOnlineEsperada(true, null)).isFalse();
        // existentes (legacy): igual que hoy
        assertThat(AltaFasesService.ventaOnlineEsperada(false, null)).isTrue();
        assertThat(AltaFasesService.ventaOnlineEsperada(false, cuenta("PENDIENTE_ONBOARDING", true))).isTrue();
        EmpresaCuentaOnvo perdida = cuenta("SUSPENDIDA", true);
        perdida.setActivadaEn(LocalDateTime.now().minusDays(3));
        assertThat(AltaFasesService.ventaOnlineEsperada(false, perdida)).isFalse();
    }

    @Test
    @DisplayName("Registro con el flag encendido deja el negocio en borrador; con el flag apagado queda como antes")
    void alRegistrarSegunFlag() {
        Empresa nueva = empresa(false, "PENDIENTE_APROBACION", true);
        svc.alRegistrar(nueva);
        assertThat(nueva.isAltaPorFases()).isTrue();
        assertThat(nueva.isVentaOnlineHabilitada()).isFalse();
        verify(empresaRepo).save(nueva);

        AltaFasesService apagado = new AltaFasesService(empresaRepo, cuentaRepo, productoRepo, caches, false);
        Empresa legacy = empresa(false, "PENDIENTE_APROBACION", true);
        apagado.alRegistrar(legacy);
        assertThat(legacy.isAltaPorFases()).isFalse();
        assertThat(legacy.isVentaOnlineHabilitada()).isTrue();
        verify(empresaRepo, times(1)).save(any());
    }

    @Test
    @DisplayName("No se puede saltar fases: aprobar sin cuenta ACTIVA falla (sin cuenta, pendiente, en aprobación, suspendida)")
    void aprobarSinCuentaActivaFalla() {
        Empresa e = empresa(true, "PENDIENTE_APROBACION", false);
        when(cuentaRepo.findByEmpresaId(5L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> svc.exigirListoParaAprobar(e)).isInstanceOf(AltaFasesException.class)
            .hasFieldOrPropertyWithValue("codigo", AltaFasesException.CODIGO_CUENTA_NO_ACTIVA);
        for (String estado : new String[] {"PENDIENTE_ONVO", "PENDIENTE_ONBOARDING", "EN_APROBACION", "INACTIVA", "SUSPENDIDA"}) {
            when(cuentaRepo.findByEmpresaId(5L)).thenReturn(Optional.of(cuenta(estado, true)));
            assertThatThrownBy(() -> svc.exigirListoParaAprobar(e)).as(estado).isInstanceOf(AltaFasesException.class);
        }
        // ACTIVA sin id de ONVO tampoco cuenta (isActiva exige el id)
        when(cuentaRepo.findByEmpresaId(5L)).thenReturn(Optional.of(cuenta("ACTIVA", false)));
        assertThatThrownBy(() -> svc.exigirListoParaAprobar(e)).isInstanceOf(AltaFasesException.class);
    }

    @Test
    @DisplayName("Aprobar con la cuenta ACTIVA pasa; un negocio existente no se toca")
    void aprobarConCuentaActivaPasa() {
        Empresa e = empresa(true, "PENDIENTE_APROBACION", false);
        when(cuentaRepo.findByEmpresaId(5L)).thenReturn(Optional.of(cuenta("ACTIVA", true)));
        assertThatCode(() -> svc.exigirListoParaAprobar(e)).doesNotThrowAnyException();
        svc.aplicarEnEmpresa(e);
        assertThat(e.isVentaOnlineHabilitada()).isTrue();

        Empresa legacy = empresa(false, "PENDIENTE_APROBACION", true);
        when(cuentaRepo.findByEmpresaId(5L)).thenReturn(Optional.empty());
        assertThatCode(() -> svc.exigirListoParaAprobar(legacy)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Cobro en línea fail-closed: borrador, pausado, sin cuenta activa o cuenta perdida no cobran")
    void cobroEnLineaFailClosed() {
        Empresa borrador = empresa(true, "PENDIENTE_APROBACION", false);
        assertThatThrownBy(() -> svc.exigirCobroEnLinea(borrador)).isInstanceOf(IllegalArgumentException.class)
            .hasMessage(AltaFasesService.MSG_SIN_COBRO_ONLINE);

        Empresa pausada = empresa(false, "ACTIVO", true);
        pausada.setCobrosPausados(true);
        assertThatThrownBy(() -> svc.exigirCobroEnLinea(pausada)).isInstanceOf(IllegalArgumentException.class);

        // el predicado dice que sí pero la cuenta ya no está ACTIVA (el poller todavía no corrió): se corta igual
        Empresa publicada = empresa(true, "ACTIVO", true);
        when(cuentaRepo.findByEmpresaId(5L)).thenReturn(Optional.of(cuenta("SUSPENDIDA", true)));
        assertThatThrownBy(() -> svc.exigirCobroEnLinea(publicada)).isInstanceOf(IllegalArgumentException.class);
        assertThat(svc.puedeCobrarEnLinea(publicada)).isFalse();

        when(cuentaRepo.findByEmpresaId(5L)).thenReturn(Optional.of(cuenta("ACTIVA", true)));
        assertThat(svc.puedeCobrarEnLinea(publicada)).isTrue();

        // cuenta ACTIVA pero todavía sin la aprobación de HotClick: no cobra en línea
        Empresa enRevision = empresa(true, "PENDIENTE_APROBACION", true);
        assertThat(svc.puedeCobrarEnLinea(enRevision)).isFalse();
    }

    @Test
    @DisplayName("Negocio existente (legacy) sigue cobrando igual que antes; el flag apagado no cambia al existente")
    void legacyNoCambia() {
        Empresa legacy = empresa(false, "ACTIVO", true);
        assertThatCode(() -> svc.exigirCobroEnLinea(legacy)).doesNotThrowAnyException();
        verifyNoInteractions(cuentaRepo);
        assertThat(svc.puedeCobrarEnLinea(null)).isTrue();
    }

    @Test
    @DisplayName("sincronizar solo escribe si el predicado cambia (y limpia caches)")
    void sincronizarEscribeSoloSiCambia() {
        Empresa e = empresa(true, "PENDIENTE_APROBACION", false);
        when(empresaRepo.findById(5L)).thenReturn(Optional.of(e));
        assertThat(svc.sincronizar(5L, cuenta("EN_APROBACION", true))).isFalse();
        verify(empresaRepo, never()).save(any());
        assertThat(svc.sincronizar(5L, cuenta("ACTIVA", true))).isTrue();
        assertThat(e.isVentaOnlineHabilitada()).isTrue();
        verify(empresaRepo).save(e);
        assertThat(svc.sincronizar(5L, cuenta("SUSPENDIDA", true))).isTrue();
        assertThat(e.isVentaOnlineHabilitada()).isFalse();
    }

    @Test
    @DisplayName("Estado para el panel: sin datos personales, con fase, cuenta y productos")
    void estadoDelPanel() {
        Empresa e = empresa(true, "PENDIENTE_APROBACION", false);
        when(empresaRepo.findById(5L)).thenReturn(Optional.of(e));
        when(cuentaRepo.findByEmpresaId(5L)).thenReturn(Optional.of(cuenta("PENDIENTE_ONBOARDING", true)));
        when(productoRepo.countProductosActivosByEmpresaId(5L)).thenReturn(2L);
        Map<String, Object> m = svc.estadoDe(5L);
        assertThat(m).containsEntry("fase", "ONVO").containsEntry("faseNumero", 3)
            .containsEntry("publicada", false).containsEntry("cuentaOnvo", "PENDIENTE_ONBOARDING")
            .containsEntry("cuentaPerdida", false).containsEntry("productosActivos", 2L);
        assertThat(m.keySet()).noneMatch(k -> k.toLowerCase().contains("correo") || k.toLowerCase().contains("telefono")
            || k.toLowerCase().contains("cedula") || k.toLowerCase().contains("url"));
        ReflectionTestUtils.setField(e, "nombreEmpresa", "x");
    }
}
