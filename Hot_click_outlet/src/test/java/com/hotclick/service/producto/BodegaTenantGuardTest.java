package com.hotclick.service.producto;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("BodegaTenantGuard — regla de pertenencia de la bodega")
class BodegaTenantGuardTest {

    private static Bodega bodegaDe(Long empresaId) {
        Bodega b = new Bodega();
        if (empresaId != null) {
            Empresa e = new Empresa();
            e.setId(empresaId);
            b.setEmpresa(e);
        }
        return b;
    }

    @Test
    @DisplayName("la bodega del mismo negocio se acepta")
    void mismaEmpresa() {
        assertTrue(BodegaTenantGuard.perteneceA(bodegaDe(7L), 7L));
    }

    @Test
    @DisplayName("la bodega de otro negocio se rechaza, incluida la de la plataforma para un negocio normal")
    void otraEmpresa() {
        assertFalse(BodegaTenantGuard.perteneceA(bodegaDe(8L), 7L));
        assertFalse(BodegaTenantGuard.perteneceA(bodegaDe(1L), 7L));
        assertFalse(BodegaTenantGuard.perteneceA(bodegaDe(null), 7L));
    }

    @Test
    @DisplayName("un negocio normal no usa bodegas de la plataforma ni sin dueño; la plataforma solo las suyas")
    void plataforma() {
        assertTrue(BodegaTenantGuard.perteneceA(bodegaDe(1L), 1L));
        assertTrue(BodegaTenantGuard.perteneceA(bodegaDe(null), 1L));
        assertFalse(BodegaTenantGuard.perteneceA(bodegaDe(8L), 1L));
    }

    @Test
    @DisplayName("producto sin empresa: solo bodegas de la plataforma o sin dueño")
    void productoSinEmpresa() {
        assertTrue(BodegaTenantGuard.perteneceA(bodegaDe(null), null));
        assertTrue(BodegaTenantGuard.perteneceA(bodegaDe(1L), null));
        assertFalse(BodegaTenantGuard.perteneceA(bodegaDe(8L), null));
    }

    @Test
    @DisplayName("bodega inexistente y bodega ajena: misma excepción y el mismo log (sin diferencia observable)")
    void inexistenteYAjena_mismaRespuestaYMismoLog() {
        var repo = org.mockito.Mockito.mock(com.hotclick.repository.BodegaRepository.class);
        org.mockito.Mockito.when(repo.findById(1L)).thenReturn(java.util.Optional.empty());
        org.mockito.Mockito.when(repo.findById(2L)).thenReturn(java.util.Optional.of(bodegaDe(99L)));
        BodegaTenantGuard guard = new BodegaTenantGuard(repo);

        var logger = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(BodegaTenantGuard.class);
        var appender = new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
        appender.start();
        logger.addAppender(appender);
        try {
            var e1 = org.junit.jupiter.api.Assertions.assertThrows(
                com.hotclick.exception.RecursoNoEncontradoException.class, () -> guard.exigirDeLaEmpresa(1L, 7L));
            var e2 = org.junit.jupiter.api.Assertions.assertThrows(
                com.hotclick.exception.RecursoNoEncontradoException.class, () -> guard.exigirDeLaEmpresa(2L, 7L));

            org.junit.jupiter.api.Assertions.assertEquals(
                e1.getMessage().replace("1", "#"), e2.getMessage().replace("2", "#"));
            org.junit.jupiter.api.Assertions.assertEquals(2, appender.list.size(), "un warn por cada rechazo");
            var l1 = appender.list.get(0);
            var l2 = appender.list.get(1);
            org.junit.jupiter.api.Assertions.assertEquals(l1.getLevel(), l2.getLevel());
            org.junit.jupiter.api.Assertions.assertEquals(l1.getMessage(), l2.getMessage());
            org.junit.jupiter.api.Assertions.assertEquals(l1.getArgumentArray().length, l2.getArgumentArray().length);
            org.junit.jupiter.api.Assertions.assertFalse(l2.getFormattedMessage().contains("99"),
                "el log no revela de quién es la bodega ajena");
        } finally {
            logger.detachAppender(appender);
        }
    }
}
