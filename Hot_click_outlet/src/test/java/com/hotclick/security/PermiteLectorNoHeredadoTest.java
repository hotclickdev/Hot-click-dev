package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.web.method.HandlerMethod;

import static org.assertj.core.api.Assertions.assertThat;

/** @PermiteLector solo cuenta si está declarada localmente; funciona con proxies CGLIB. */
class PermiteLectorNoHeredadoTest {

    public static class Base {
        @PermiteLector public void abierto() {}
        public void cerrado() {}
    }
    public static class Hija extends Base {
        @Override public void cerrado() {}
    }
    public static class HijaQueRedefine extends Base {
        @Override public void abierto() {}
    }
    @PermiteLector public static class ClaseAbierta { public void x() {} }
    public static class HijaDeClaseAbierta extends ClaseAbierta { @Override public void x() {} }

    private static boolean permite(Object bean, String metodo) throws Exception {
        return LectorSoloLecturaInterceptor.permiteLector(new HandlerMethod(bean, metodo));
    }

    @Test
    void metodoAnotadoLocalmente() throws Exception {
        assertThat(permite(new Base(), "abierto")).isTrue();
        assertThat(permite(new Base(), "cerrado")).isFalse();
    }

    @Test
    void noSeHeredaDeSuperclase() throws Exception {
        assertThat(permite(new Hija(), "abierto")).as("heredado sin redefinir").isFalse();
        assertThat(permite(new HijaQueRedefine(), "abierto")).as("override sin anotación").isFalse();
        assertThat(permite(new HijaDeClaseAbierta(), "x")).as("clase hija de clase anotada").isFalse();
        assertThat(permite(new ClaseAbierta(), "x")).isTrue();
    }

    @Test
    void funcionaConProxyCglib() throws Exception {
        for (Object target : new Object[]{new Base(), new ClaseAbierta()}) {
            ProxyFactory pf = new ProxyFactory(target);
            pf.setProxyTargetClass(true);
            Object proxy = pf.getProxy();
            assertThat(proxy.getClass()).isNotEqualTo(target.getClass());
            String m = target instanceof Base ? "abierto" : "x";
            assertThat(permite(proxy, m)).as("proxy de " + target.getClass().getSimpleName()).isTrue();
        }
        ProxyFactory pf = new ProxyFactory(new Hija());
        pf.setProxyTargetClass(true);
        assertThat(permite(pf.getProxy(), "abierto")).isFalse();
    }
}
