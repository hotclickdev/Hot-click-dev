package com.hotclick.utils;

import com.hotclick.exception.RecursoNoEncontradoException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ESC-3 | mensajes de error públicos")
class ErrorPublicoTest {

    @Test
    void validacionesPropiasSeMuestran() {
        assertThat(ErrorPublico.mensaje(new IllegalArgumentException("El correo ya está registrado"))).isEqualTo("El correo ya está registrado");
        assertThat(ErrorPublico.mensaje(new RecursoNoEncontradoException("Pedido no encontrado"))).isEqualTo("Pedido no encontrado");
    }

    @Test
    void internosSonGenericos() {
        assertThat(ErrorPublico.mensaje(new DataIntegrityViolationException("insert into hot_click_usuario_tb ..."))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new RuntimeException("NullPointer en X"))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new IllegalStateException("could not execute statement; SQL [n/a]"))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(null)).isEqualTo(ErrorPublico.GENERICO);
    }

    // ── L3: lista blanca por origen ──────────────────────────────────────────

    @Test
    void iaeDeLibreriaOJdkEsGenerica() {
        // NumberFormatException (IAE) lanzada por el JDK: su texto lleva el valor recibido
        RuntimeException nfe = null;
        try { Long.parseLong("tabla_usuarios_clientes"); } catch (NumberFormatException e) { nfe = e; }
        assertThat(ErrorPublico.mensaje(nfe)).isEqualTo(ErrorPublico.GENERICO);
        // IAE de Spring Assert
        RuntimeException spring = null;
        try { org.springframework.util.Assert.notNull(null, "campo interno_x requerido"); } catch (IllegalArgumentException e) { spring = e; }
        assertThat(ErrorPublico.mensaje(spring)).isEqualTo(ErrorPublico.GENERICO);
    }

    @Test
    void iaeSinTrazaFallaCerrado() {
        IllegalArgumentException sinTraza = new IllegalArgumentException("Texto que parece válido");
        sinTraza.setStackTrace(new StackTraceElement[0]);
        assertThat(ErrorPublico.mensaje(sinTraza)).isEqualTo(ErrorPublico.GENERICO);
    }

    @Test
    void iaeLanzadaDesdeLibreriaConTrazaAjenaEsGenerica() {
        IllegalStateException ajena = new IllegalStateException("Texto que parece válido");
        ajena.setStackTrace(new StackTraceElement[]{new StackTraceElement("org.hibernate.Algo", "m", "A.java", 1)});
        assertThat(ErrorPublico.mensaje(ajena)).isEqualTo(ErrorPublico.GENERICO);
    }

    @Test
    void excepcionPropiaMarcadaOEnPaqueteExceptionSeMuestra() {
        assertThat(ErrorPublico.mensaje(new com.hotclick.exception.TenantAccessDeniedException("No es de tu negocio")))
            .isEqualTo("No es de tu negocio");
        assertThat(ErrorPublico.mensaje(new com.hotclick.service.producto.ProductoAltaService.ContenidoNoPermitidoException()))
            .isNotEqualTo(ErrorPublico.GENERICO);
    }

    @Test
    void propiaPeroConTextoInternoOLargoEsGenerica() {
        assertThat(ErrorPublico.mensaje(new com.hotclick.exception.TenantAccessDeniedException("SELECT x FROM hot_click_t")))
            .isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new IllegalArgumentException("a".repeat(301)))).isEqualTo(ErrorPublico.GENERICO);
    }

    // ── M1/L1/L2: causa, primer frame estricto y texto con pinta de interno ───

    @Test
    void conCausaEsGenericaAunqueSeaPropia() {
        RuntimeException libreria = new RuntimeException("connect to 10.0.0.5:5432 refused");
        assertThat(ErrorPublico.mensaje(new IllegalArgumentException("Error al firmar", libreria))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new IllegalStateException("No se pudo procesar el pedido", libreria))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new RecursoNoEncontradoException("Pedido no encontrado", libreria))).isEqualTo(ErrorPublico.GENERICO);
        // sin causa sigue viéndose
        assertThat(ErrorPublico.mensaje(new IllegalStateException("No se pudo procesar el pedido"))).isEqualTo("No se pudo procesar el pedido");
    }

    @Test
    void primerFrameDebeSerNuestroSinSaltarProxies() {
        for (String clase : new String[]{"org.springframework.aop.framework.CglibAopProxy",
                "org.springframework.transaction.interceptor.TransactionAspectSupport",
                "org.springframework.cglib.proxy.MethodProxy", "net.bytebuddy.Algo", "org.mockito.Algo",
                "jdk.internal.reflect.DirectMethodHandleAccessor", "java.lang.reflect.Method"}) {
            IllegalArgumentException e = new IllegalArgumentException("Texto que parece válido");
            e.setStackTrace(new StackTraceElement[]{
                new StackTraceElement(clase, "m", "A.java", 1),
                new StackTraceElement("com.hotclick.service.Algo", "m", "Algo.java", 1)});
            assertThat(ErrorPublico.mensaje(e)).as(clase).isEqualTo(ErrorPublico.GENERICO);
        }
        IllegalArgumentException propia = new IllegalArgumentException("Texto que parece válido");
        propia.setStackTrace(new StackTraceElement[]{new StackTraceElement("com.hotclick.service.Algo", "m", "Algo.java", 1)});
        assertThat(ErrorPublico.mensaje(propia)).isEqualTo("Texto que parece válido");
    }

    @Test
    void errorYOutOfMemoryNuncaSeMuestran() {
        assertThat(ErrorPublico.mensaje(new OutOfMemoryError("Java heap space"))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new StackOverflowError())).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new AssertionError("Texto que parece válido"))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new IllegalStateException("Java heap space"))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new IllegalStateException("GC overhead limit exceeded"))).isEqualTo(ErrorPublico.GENERICO);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {
        "No se pudo llamar a https://api.onvo.test/v1/pay",
        "Falló http://interno/health",
        "jdbc-less: ftp://host/x",
        "Conexión rechazada: db-prod:5432",
        "No conecta a redis.interno:6379",
        "Error con api.openai.com",
        "Falló hotclick.lat",
        "Host 10.0.3.12 no responde",
        "Host 2001:db8:0:0:0:0:0:1 no responde",
        "No existe /etc/hotclick/secret.pem",
        "No se pudo leer /var/log/app.log",
        "/tmp/upload123.pdf inválido",
        "No se pudo abrir C:\\Users\\admin\\x.p12",
        "Falló \\\\servidor\\share",
        "No se encontró file:/opt/x"})
    void textoConUrlHostIpORutaEsGenerico(String texto) {
        assertThat(ErrorPublico.mensaje(new IllegalArgumentException(texto))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new RecursoNoEncontradoException(texto))).isEqualTo(ErrorPublico.GENERICO);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {
        "El precio de venta es inválido",
        "Ingresá un valor entre 1 y 100 km/h",
        "Cantidad y/o precio inválidos",
        "Relación 1/2 no permitida",
        "El horario va de 8:00 a 18:00",
        "Versión 1.5 no soportada",
        "Precio/Costo requerido",
        "Tu plan permite hasta 50 productos. Mejorá tu plan."})
    void validacionesPropiasNormalesSiguenViendose(String texto) {
        assertThat(ErrorPublico.mensaje(new IllegalArgumentException(texto))).isEqualTo(texto);
    }
}
