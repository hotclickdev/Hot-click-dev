package com.hotclick.agente.metricas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.TelegramService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/** AG-32: avisos de cuenta o calidad del número de Meta: se registran limpios y alertan al ADMIN. */
class AlertaCalidadMetaTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private AlertaMetaRepositorio repo;
    private TelegramService telegram;
    private AlertaCalidadMeta alerta;

    @BeforeEach
    void init() {
        repo = mock(AlertaMetaRepositorio.class);
        telegram = mock(TelegramService.class);
        alerta = new AlertaCalidadMeta(repo, telegram);
    }

    private static JsonNode json(String texto) throws Exception {
        return JSON.readTree(texto);
    }

    @Test
    @SuppressWarnings("unchecked")
    void accountUpdateSeGuardaEnUnLoteYAvisaAlAdmin() throws Exception {
        int n = alerta.registrar(json("{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"123456\","
            + "\"changes\":[{\"field\":\"account_update\",\"value\":{\"event\":\"ACCOUNT_VIOLATION\"}},"
            + "{\"field\":\"phone_number_quality_update\",\"value\":{\"event\":\"DOWNGRADE\","
            + "\"current_limit\":\"TIER_1K\",\"display_phone_number\":\"50688881234\"}}]}]}"));

        assertThat(n).isEqualTo(2);
        ArgumentCaptor<List<AlertaMetaRepositorio.Aviso>> lote = ArgumentCaptor.forClass(List.class);
        verify(repo).insertar(lote.capture());
        assertThat(lote.getValue()).extracting(AlertaMetaRepositorio.Aviso::campo)
            .containsExactly("account_update", "phone_number_quality_update");
        assertThat(lote.getValue().get(1).limite()).isEqualTo("TIER_1K");
        assertThat(lote.getValue().get(1).cuentaExterna()).isEqualTo("123456");
        ArgumentCaptor<String> texto = ArgumentCaptor.forClass(String.class);
        verify(telegram).enviar(texto.capture());
        assertThat(texto.getValue()).contains("2 aviso(s)").contains("downgrade").doesNotContain("50688881234");
    }

    @Test
    void unEventoDeMensajesNoGeneraAlerta() throws Exception {
        int n = alerta.registrar(json("{\"entry\":[{\"changes\":[{\"field\":\"messages\",\"value\":{\"messages\":[]}}]}]}"));

        assertThat(n).isZero();
        verify(repo, never()).insertar(any());
        verify(telegram, never()).enviar(anyString());
    }

    @Test
    void elTextoDeMetaSeLimpiaYSeRecorta() {
        assertThat(AlertaCalidadMeta.limpiar("DOWN<script>GRADE*_x")).isEqualTo("DOWNscriptGRADE_x");
        assertThat(AlertaCalidadMeta.limpiar("!!!")).isNull();
        assertThat(AlertaCalidadMeta.limpiar("a".repeat(100))).hasSize(AlertaCalidadMeta.MAX_CAMPO);
        assertThat(AlertaCalidadMeta.limpiar(null)).isNull();
    }

    @Test
    void siFallaLaBaseIgualSeAvisaAlAdminYNoSePropagaElError() throws Exception {
        doThrow(new IllegalStateException("base caída")).when(repo).insertar(any());

        int n = alerta.registrar(json("{\"entry\":[{\"id\":\"1\",\"changes\":[{\"field\":\"account_alerts\","
            + "\"value\":{\"event\":\"X\"}}]}]}"));

        assertThat(n).isEqualTo(1);
        verify(telegram).enviar(anyString());
    }
}
