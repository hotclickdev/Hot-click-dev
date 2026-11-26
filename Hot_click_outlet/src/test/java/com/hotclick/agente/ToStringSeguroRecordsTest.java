package com.hotclick.agente;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AssignableTypeFilter;

import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AG-14 H-07: ningún record de {@code com.hotclick.agente} con datos personales o credenciales usa el
 * {@code toString} por defecto (que imprimiría el código del enlace, el contacto o el texto del cliente si alguien
 * lo pone en un log). Recorre por reflexión todos los records del paquete, los instancia con un valor marcado en cada
 * String y, si un componente tiene un nombre sensible, su {@code toString} no puede contener ese valor.
 */
class ToStringSeguroRecordsTest {

    /** Nombres de componente (en minúsculas) que llevan datos personales, credenciales o texto del cliente. */
    private static final Set<String> SENSIBLES = Set.of(
        "codigo", "code", "url", "contacto", "contactoexterno", "contactocifrado", "contactoenmascarado",
        "ultimos4", "texto", "mensaje", "historial", "accesstoken", "token", "pin", "resumen", "sugerencia",
        "cuerpo", "numerospedido", "dato", "nombrecliente", "telefonomascara", "telefono", "correo", "email",
        "resumenchat");

    @Test
    void recordsConDatosPersonalesNoUsanElToStringPorDefecto() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AssignableTypeFilter(Record.class));

        List<String> filtran = new ArrayList<>();
        int revisados = 0;
        for (BeanDefinition bd : scanner.findCandidateComponents("com.hotclick.agente")) {
            Class<?> tipo = Class.forName(bd.getBeanClassName());
            if (!tipo.isRecord()) continue;
            List<String> sensibles = nombresSensibles(tipo);
            if (sensibles.isEmpty()) continue;
            revisados++;
            filtran.addAll(valoresQueFiltran(tipo, sensibles));
        }

        assertThat(revisados).as("el escaneo debe encontrar records sensibles").isGreaterThan(5);
        assertThat(filtran).as("toString que imprime un componente sensible (o record que no se pudo instanciar)")
            .isEmpty();
    }

    private static List<String> nombresSensibles(Class<?> tipo) {
        List<String> r = new ArrayList<>();
        for (RecordComponent c : tipo.getRecordComponents()) {
            if (SENSIBLES.contains(c.getName().toLowerCase(Locale.ROOT))) r.add(c.getName());
        }
        return r;
    }

    /** Crea el record con un valor marcado en cada String y comprueba que el toString no lo contiene. */
    private static List<String> valoresQueFiltran(Class<?> tipo, List<String> sensibles) throws Exception {
        RecordComponent[] comps = tipo.getRecordComponents();
        Class<?>[] tipos = new Class<?>[comps.length];
        Object[] args = new Object[comps.length];
        for (int i = 0; i < comps.length; i++) {
            tipos[i] = comps[i].getType();
            args[i] = valorDePrueba(comps[i]);
        }
        Constructor<?> ctor = tipo.getDeclaredConstructor(tipos);
        ctor.setAccessible(true);
        Object instancia;
        try {
            instancia = ctor.newInstance(args);
        } catch (ReflectiveOperationException | RuntimeException e) {
            return List.of(tipo.getName() + " no se pudo instanciar con valores de prueba");
        }
        String texto = String.valueOf(instancia);
        List<String> r = new ArrayList<>();
        for (String nombre : sensibles) {
            if (comps[indice(comps, nombre)].getType() == String.class && texto.contains(marca(nombre))) {
                r.add(tipo.getName() + "." + nombre);
            }
        }
        return r;
    }

    private static int indice(RecordComponent[] comps, String nombre) {
        for (int i = 0; i < comps.length; i++) if (comps[i].getName().equals(nombre)) return i;
        return -1;
    }

    private static String marca(String nombre) {
        return "VALOR_PRIVADO_" + nombre;
    }

    private static Object valorDePrueba(RecordComponent c) {
        Class<?> t = c.getType();
        if (t == String.class) return marca(c.getName());
        if (t.isEnum()) return t.getEnumConstants()[0];
        if (t == Long.class) return 1L;
        if (t == boolean.class) return false;
        if (t == int.class) return 0;
        if (t == long.class) return 0L;
        if (t == double.class) return 0d;
        if (t == List.class) return List.of();
        if (t == Set.class) return Set.of();
        if (t == Map.class) return Map.of();
        if (t.isPrimitive() || Modifier.isAbstract(t.getModifiers()) && !t.isInterface()) return null;
        return null;
    }
}
