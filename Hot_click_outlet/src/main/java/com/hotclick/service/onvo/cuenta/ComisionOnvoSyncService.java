package com.hotclick.service.onvo.cuenta;

import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.fiscal.ComisionEfectivaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Sincroniza con ONVO la comisión efectiva de cada negocio ({@code marketplaceAppFee} de su cuenta conectada).
 * Solo consume {@link ComisionEfectivaService}; no la modifica. Idempotente: llama a ONVO únicamente cuando el
 * porcentaje efectivo difiere del último enviado, o cuando quedó pendiente por un fallo. Un fallo nunca rompe a
 * quien lo dispara: queda "pendiente de sincronizar" y el job de conciliación reintenta.
 */
@Service
public class ComisionOnvoSyncService {

    private static final Logger log = LoggerFactory.getLogger(ComisionOnvoSyncService.class);

    public enum Resultado { SIN_CUENTA, SIN_CAMBIO, SINCRONIZADO, PENDIENTE }

    /** Estado para la ficha del negocio (ADMIN). */
    public record Estado(BigDecimal efectivoPct, BigDecimal enviadoPct, LocalDateTime enviadoEn, boolean pendiente,
                         boolean tieneCuenta, String ultimoError) {}

    private final EmpresaCuentaOnvoRepository repo;
    private final EmpresaRepository empresaRepository;
    private final ComisionEfectivaService comision;
    private final OnvoCuentaConectadaClient client;
    private final TransactionTemplate tx;
    private final boolean habilitado;
    private final int lote;

    public ComisionOnvoSyncService(EmpresaCuentaOnvoRepository repo, EmpresaRepository empresaRepository,
                                   ComisionEfectivaService comision, OnvoCuentaConectadaClient client,
                                   PlatformTransactionManager txManager,
                                   @Value("${payments.onvo.enabled:false}") boolean habilitado,
                                   @Value("${onvo.comision.sync.lote:100}") int lote) {
        this.repo = repo;
        this.empresaRepository = empresaRepository;
        this.comision = comision;
        this.client = client;
        this.tx = new TransactionTemplate(txManager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.habilitado = habilitado;
        this.lote = lote;
    }

    /** Sincroniza una empresa. {@code forzar} reenvía aunque el valor no haya cambiado (botón del ADMIN). */
    public Resultado sincronizar(Long empresaId, boolean forzar) {
        return tx.execute(s -> {
            EmpresaCuentaOnvo c = repo.findByEmpresaId(empresaId).orElse(null);
            Empresa e = empresaRepository.findById(empresaId).orElse(null);
            if (c == null || e == null || c.getOnvoAccountId() == null) return Resultado.SIN_CUENTA;
            BigDecimal efectivo = comision.porcentajeEfectivo(e).setScale(2, RoundingMode.HALF_UP);
            boolean igual = c.getFeeEnviadoPct() != null && c.getFeeEnviadoPct().compareTo(efectivo) == 0;
            if (!forzar && igual && !c.isFeePendiente()) return Resultado.SIN_CAMBIO;
            if (!habilitado) return pendiente(c, "ONVO deshabilitado", false);
            try {
                client.actualizarComision(c.getOnvoAccountId(), efectivo);
            } catch (OnvoCuentaConectadaClient.OnvoNoConfiguradoException ex) {
                return pendiente(c, "ONVO sin llave", false);
            } catch (RuntimeException ex) {
                return pendiente(c, "Error ONVO: " + ex.getClass().getSimpleName(), true);
            }
            c.setFeeEnviadoPct(efectivo);
            c.setFeeEnviadoEn(LocalDateTime.now());
            c.setFeePendiente(false);
            c.setFeeIntentos(0);
            c.setFeeUltimoError(null);
            repo.save(c);
            log.info("[onvo-comision] Comisión sincronizada empresa={} pct={}", empresaId, efectivo);
            return Resultado.SINCRONIZADO;
        });
    }

    private Resultado pendiente(EmpresaCuentaOnvo c, String motivo, boolean contarIntento) {
        c.setFeePendiente(true);
        c.setFeeUltimoError(motivo.length() > 300 ? motivo.substring(0, 300) : motivo);
        if (contarIntento) c.setFeeIntentos(c.getFeeIntentos() + 1);
        repo.save(c);
        // Sin PII: solo id de empresa y la clase del error.
        log.warn("[onvo-comision] Pendiente de sincronizar empresa={} motivo={}", c.getEmpresaId(), c.getFeeUltimoError());
        return Resultado.PENDIENTE;
    }

    /** Variante que nunca lanza: para hooks (cambio de plan, aprobación) que no deben fallar por ONVO. */
    public void sincronizarSeguro(Long empresaId) {
        try {
            sincronizar(empresaId, false);
        } catch (RuntimeException e) {
            log.warn("[onvo-comision] Sincronización falló empresa={}: {}", empresaId, e.getClass().getSimpleName());
        }
    }

    /** Tamaño de página con que el job recorre las cuentas. */
    public int lote() { return lote; }

    /** Ids de empresa con cuenta conectada, por páginas (el job los recorre y sincroniza uno a uno). */
    public List<Long> empresasConCuenta(int pagina) {
        return repo.findByOnvoAccountIdIsNotNullOrderByIdAsc(PageRequest.of(pagina, lote))
            .stream().mapToLong(EmpresaCuentaOnvo::getEmpresaId).boxed().toList();
    }

    /**
     * Porcentaje que ONVO retendrá en un cobro a nombre de la cuenta conectada, o null si no se puede garantizar:
     * intenta sincronizar y solo devuelve el valor si coincide con el efectivo y no hay pendiente. Con null el cobro
     * va a nombre de la plataforma y HotClick descuenta la comisión como siempre (nunca se cobra dos veces).
     */
    public BigDecimal feeVigente(Long empresaId) {
        sincronizarSeguro(empresaId);
        try {
            Empresa e = empresaRepository.findById(empresaId).orElse(null);
            EmpresaCuentaOnvo c = repo.findByEmpresaId(empresaId).orElse(null);
            if (e == null || c == null || c.getFeeEnviadoPct() == null || c.isFeePendiente()) return null;
            BigDecimal efectivo = comision.porcentajeEfectivo(e).setScale(2, RoundingMode.HALF_UP);
            return c.getFeeEnviadoPct().compareTo(efectivo) == 0 ? c.getFeeEnviadoPct() : null;
        } catch (RuntimeException ex) {
            return null;
        }
    }

    public Estado estado(Long empresaId) {
        Empresa e = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));
        BigDecimal efectivo = comision.porcentajeEfectivo(e).setScale(2, RoundingMode.HALF_UP);
        EmpresaCuentaOnvo c = repo.findByEmpresaId(empresaId).orElse(null);
        boolean tiene = c != null && c.getOnvoAccountId() != null;
        if (!tiene) return new Estado(efectivo, null, null, false, false, null);
        boolean desfasado = c.getFeeEnviadoPct() == null || c.getFeeEnviadoPct().compareTo(efectivo) != 0;
        return new Estado(efectivo, c.getFeeEnviadoPct(), c.getFeeEnviadoEn(), c.isFeePendiente() || desfasado,
            true, c.getFeeUltimoError());
    }
}
