package com.hotclick.scheduler;

import com.hotclick.model.Empresa;
import com.hotclick.model.PayoutRequest;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.wallet.WalletLiquidacionService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Corre a diario: liquidación contra entrega del día anterior para todos, y la liquidación de tarjeta
 * solo en los días de corte (QUINCENAL: 1 y 16; MENSUAL: 1 — configurables, pendiente confirmar con HOT_CLICK).
 */
@Component
public class LiquidacionWalletScheduler {

    private static final Logger log = LoggerFactory.getLogger(LiquidacionWalletScheduler.class);

    private final WalletLiquidacionService liquidacionService;
    private final EmpresaRepository empresaRepo;
    private final Set<Integer> diasQuincenal;
    private final Set<Integer> diasMensual;

    public LiquidacionWalletScheduler(WalletLiquidacionService liquidacionService, EmpresaRepository empresaRepo,
                                      @Value("${hotclick.payout.dias-quincenal:1,16}") String diasQuincenal,
                                      @Value("${hotclick.payout.dias-mensual:1}") String diasMensual) {
        this.liquidacionService = liquidacionService;
        this.empresaRepo = empresaRepo;
        this.diasQuincenal = dias(diasQuincenal);
        this.diasMensual = dias(diasMensual);
    }

    private static Set<Integer> dias(String csv) {
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty())
            .map(Integer::valueOf).collect(Collectors.toSet());
    }

    @Scheduled(cron = "${hotclick.payout.cron:0 30 6 * * *}", zone = "America/Costa_Rica")
    public void ejecutar() {
        ejecutarPara(LocalDate.now(Constants.ZONA_CR));
    }

    /** Visible para pruebas. Corte = inicio del día {@code hoy}: se liquida lo de ayer y antes. */
    public void ejecutarPara(LocalDate hoy) {
        LocalDateTime corte = hoy.atStartOfDay();
        for (Long empresaId : liquidacionService.empresasConVentasSinLiquidar(corte)) {
            correr(empresaId, PayoutRequest.LIQ_CONTRA_ENTREGA, corte);
            if (esDiaDeCorteTarjeta(empresaId, hoy.getDayOfMonth())) {
                correr(empresaId, PayoutRequest.LIQ_TARJETA, corte);
            }
        }
    }

    boolean esDiaDeCorteTarjeta(Long empresaId, int dia) {
        String frecuencia = empresaRepo.findById(empresaId).map(Empresa::getFrecuenciaPayout).orElse(null);
        if (frecuencia == null) {
            // Sin frecuencia elegida no se asume QUINCENAL (decisión del dueño): el saldo queda retenido hasta que elija.
            log.warn("[liquidacion] empresa={} sin frecuencia de pago elegida: payout de tarjeta omitido", empresaId);
            return false;
        }
        return "MENSUAL".equals(frecuencia) ? diasMensual.contains(dia) : diasQuincenal.contains(dia);
    }

    private void correr(Long empresaId, String tipo, LocalDateTime corte) {
        try {
            liquidacionService.liquidar(empresaId, tipo, corte);
        } catch (RuntimeException e) {
            // otro payout del mismo tipo aún abierto, etc.: se reintenta en la próxima corrida
            log.warn("[liquidacion] empresa={} {} omitida: {}", empresaId, tipo, e.getMessage());
        }
    }
}
