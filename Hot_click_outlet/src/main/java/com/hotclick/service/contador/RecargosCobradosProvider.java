package com.hotclick.service.contador;

import java.time.YearMonth;
import java.util.OptionalLong;

/**
 * Recargo (hoy 14 %) cobrado a los negocios por cada venta. Hoy no se registra por separado, así que la
 * implementación por defecto responde "sin dato"; la Fase 3 (cobro en ONVO) lo alimentará.
 */
public interface RecargosCobradosProvider {
    OptionalLong cobradoEnMes(YearMonth mes);
}
