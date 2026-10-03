package com.hotclick.service.pos;

import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PosQrSesionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QR de caja: el texto «vencido» usa la vigencia real del backend")
class PosQrVigenciaTest {
    @Mock PosQrSesionRepository posQrRepo;
    @Mock BodegaRepository bodegaRepo;
    @InjectMocks PosQrSessionService service;

    @Test
    @DisplayName("La info pública manda vigenciaMinutos (30)")
    void infoPublicaMandaLaVigencia() {
        when(posQrRepo.findByToken("tok")).thenReturn(Optional.of(PosQrMetodosTest.sesion("SINPE", null)));
        assertThat(service.getInfoPublica("tok")).containsEntry("vigenciaMinutos", PosQrSessionService.VIGENCIA_MINUTOS);
        assertThat(PosQrSessionService.VIGENCIA_MINUTOS).isEqualTo(30);
    }

    @Test
    @DisplayName("El valor por defecto del frontend es el mismo que el del backend")
    void frontendIgualAlBackend() throws Exception {
        Path fuente = Path.of("frontend/src/features/pos-pago/posPagoFormat.ts");
        assumeTrue(Files.exists(fuente), "solo con el repo completo (mvn desde Hot_click_outlet)");
        Matcher m = Pattern.compile("export const VIGENCIA_QR_MINUTOS = (\\d+)").matcher(Files.readString(fuente));
        assertThat(m.find()).isTrue();
        assertThat(Integer.parseInt(m.group(1))).isEqualTo(PosQrSessionService.VIGENCIA_MINUTOS);
    }
}
