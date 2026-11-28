package com.hotclick.service.contador;

import org.springframework.stereotype.Component;

import java.time.YearMonth;
import java.util.OptionalLong;

@Component
public class RecargosCobradosVacio implements RecargosCobradosProvider {
    @Override
    public OptionalLong cobradoEnMes(YearMonth mes) {
        return OptionalLong.empty();
    }
}
