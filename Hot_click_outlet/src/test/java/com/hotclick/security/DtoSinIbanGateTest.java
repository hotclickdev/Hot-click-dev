package com.hotclick.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.RegexPatternTypeFilter;

import java.lang.reflect.Field;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Gate IBAN/SINPE: ningún DTO de respuesta lleva un campo IBAN. El IBAN completo solo vive en la
 * entidad (lo ve su negocio y el admin); hacia afuera sale la máscara. Los DTOs de entrada
 * ({@code *Request}) sí pueden recibirlo.
 */
@DisplayName("Gate | los DTOs de respuesta no llevan IBAN")
class DtoSinIbanGateTest {

    @Test
    void ningunDtoDeRespuestaTieneIban() throws Exception {
        var scanner = new ClassPathScanningCandidateComponentProvider(false) {
            @Override
            protected boolean isCandidateComponent(org.springframework.beans.factory.annotation.AnnotatedBeanDefinition d) {
                return true;
            }
        };
        scanner.addIncludeFilter(new RegexPatternTypeFilter(Pattern.compile(".*")));
        List<String> hallazgos = new ArrayList<>();
        int revisados = 0;
        for (BeanDefinition bd : scanner.findCandidateComponents("com.hotclick.dto")) {
            Class<?> c = Class.forName(bd.getBeanClassName());
            if (c.getSimpleName().endsWith("Request")) continue;
            revisados++;
            for (Field f : c.getDeclaredFields()) {
                if (f.getName().toLowerCase(Locale.ROOT).contains("iban")) hallazgos.add(c.getName() + "." + f.getName());
            }
            if (c.isRecord()) {
                for (RecordComponent rc : c.getRecordComponents()) {
                    if (rc.getName().toLowerCase(Locale.ROOT).contains("iban")) hallazgos.add(c.getName() + "." + rc.getName());
                }
            }
        }
        assertThat(revisados).as("el escaneo encontró DTOs").isGreaterThan(20);
        assertThat(hallazgos).as("DTOs de respuesta con IBAN").isEmpty();
    }

    @Test
    void elToStringDeLasEntidadesNoLlevaIban() {
        String iban = "CR00" + "0000" + "0000" + "0000" + "0000" + "00";
        var payout = new com.hotclick.model.PayoutRequest();
        payout.setDestinoIban(iban);
        var cuenta = new com.hotclick.model.MetodoCobro();
        cuenta.setDestino(iban);
        assertThat(payout.toString()).doesNotContain(iban);
        assertThat(cuenta.toString()).doesNotContain(iban);
    }
}
