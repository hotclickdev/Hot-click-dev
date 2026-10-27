package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.Empresa;
import com.hotclick.model.GiftCard;
import com.hotclick.model.Pedido;
import com.hotclick.model.SplitPago;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.GiftCardRepository;
import com.hotclick.repository.SplitPagoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.security.SecureRandom;

@Service
public class GiftCardService {

    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RNG = new SecureRandom();

    /** Largo mínimo de un código manual: con menos caracteres se adivina probando códigos. */
    public static final int CODIGO_MIN = 8;
    /** Largo de la columna {@code codigo} (VARCHAR 30). */
    public static final int CODIGO_MAX = 30;

    /**
     * Alfabeto de un código manual: letras ASCII (sin tildes ni ß/ı, que al pasar a mayúsculas cambian de forma),
     * números y guion. Se valida el texto tal como llega y después se pasa a mayúsculas con {@link Locale#ROOT},
     * así el resultado cumple {@code ^[A-Z0-9-]{8,30}$}. Sin esto entraban NBSP, caracteres de ancho cero o HTML.
     */
    private static final Pattern CODIGO_MANUAL = Pattern.compile("^[A-Za-z0-9-]{" + CODIGO_MIN + "," + CODIGO_MAX + "}$");

    /** Tope del saldo de una gift card en colones; configurable con {@code hotclick.giftcard.monto-maximo}. */
    @Value("${hotclick.giftcard.monto-maximo:1000000}")
    private int montoMaximo = 1_000_000;

    @Autowired private GiftCardRepository giftCardRepository;
    @Autowired private SplitPagoRepository splitPagoRepository;
    @Autowired private EmpresaRepository empresaRepository;

    // ── Admin CRUD ────────────────────────────────────────────────────────────

    @Transactional
    public GiftCard crear(Long empresaId, Integer monto, LocalDate fechaVencimiento, String codigoManual) {
        validarMonto(monto);
        boolean manual = codigoManual != null && !codigoManual.isBlank();
        String codigo = null;
        if (manual) {
            String crudo = codigoManual.trim();
            if (!CODIGO_MANUAL.matcher(crudo).matches()) {
                throw new IllegalArgumentException("El código debe tener entre " + CODIGO_MIN + " y " + CODIGO_MAX
                    + " caracteres y solo puede llevar letras sin tildes (A-Z), números y guiones.");
            }
            codigo = crudo.toUpperCase(Locale.ROOT);
        }
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));

        if (!manual) {
            codigo = generarCodigo(empresaId);
        }
        // El código es único en toda la plataforma (restricción UNIQUE): se revisa sin distinguir negocio
        // y el mensaje no dice de quién es, para no servir de oráculo entre negocios.
        if (giftCardRepository.findByCodigo(codigo).isPresent()) {
            throw new CodigoGiftCardDuplicadoException();
        }

        GiftCard gc = new GiftCard();
        gc.setEmpresa(empresa);
        gc.setCodigo(codigo);
        gc.setSaldoInicial(monto);
        gc.setSaldoActual(monto);
        gc.setEstado("ACTIVA");
        gc.setFechaVencimiento(fechaVencimiento);
        try {
            return giftCardRepository.saveAndFlush(gc);
        } catch (DataIntegrityViolationException carrera) {
            // Dos altas simultáneas con el mismo código: gana la primera, la otra recibe 409 y no 500.
            throw new CodigoGiftCardDuplicadoException();
        }
    }

    /** Para logs: solo los últimos 4 caracteres del código ({@code ****AB12}); un código con saldo vale dinero. */
    public static String enmascarar(String codigo) {
        if (codigo == null || codigo.isBlank()) return "****";
        String c = codigo.trim();
        return c.length() <= 8 ? "****" : "****" + c.substring(c.length() - 4);
    }

    private void validarMonto(Integer monto) {
        if (monto == null || monto <= 0 || monto > montoMaximo) {
            throw new IllegalArgumentException(
                "El monto debe ser un número entero mayor a 0 y no mayor a ₡" + montoMaximo + ".");
        }
    }

    /** El código de la gift card ya lo usa otra (de cualquier negocio): el controlador responde 409. */
    public static class CodigoGiftCardDuplicadoException extends RuntimeException {
        public CodigoGiftCardDuplicadoException() {
            super("Ese código no está disponible. Elegí otro o dejá el campo vacío para generar uno.");
        }
    }

    public List<GiftCard> listarPorEmpresa(Long empresaId) {
        return giftCardRepository.findByEmpresaIdOrderByFechaCreacionDesc(empresaId);
    }

    @Transactional
    public void cancelar(Long id, Long empresaId) {
        GiftCard gc = giftCardRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Gift card no encontrada"));
        if (!Objects.equals(gc.getEmpresa().getId(), empresaId)) {
            throw new SecurityException("No tiene permiso sobre esta gift card");
        }
        gc.setEstado("CANCELADA");
        giftCardRepository.save(gc);
    }

    // ── Validación pública ────────────────────────────────────────────────────

    /**
     * Validates a gift card for a given empresa without modifying any state.
     * Returns the card if valid; empty if invalid, cancelled, expired, or depleted.
     */
    @Transactional
    public Optional<GiftCard> validar(String codigo, Long empresaId) {
        return validarPublico(codigo).filter(gc -> gc.getEmpresa().getId().equals(empresaId));
    }

    /**
     * Valida sin exigir tenant: el comprador del marketplace no tiene JWT de empresa.
     * La tarjeta sigue siendo de una tienda; el checkout la aplica solo al paquete de esa tienda.
     */
    @Transactional
    public Optional<GiftCard> validarPublico(String codigo) {
        Optional<GiftCard> opt = giftCardRepository.findByCodigo(codigo.trim().toUpperCase(Locale.ROOT));
        if (opt.isEmpty()) return Optional.empty();

        GiftCard gc = opt.get();
        if (gc.getEmpresa() == null) return Optional.empty();
        if (!"ACTIVA".equals(gc.getEstado())) return Optional.empty();
        if (gc.getSaldoActual() <= 0) return Optional.empty();
        if (gc.getFechaVencimiento() != null && gc.getFechaVencimiento().isBefore(LocalDate.now(Constants.ZONA_CR))) {
            gc.setEstado("VENCIDA");
            giftCardRepository.save(gc);
            return Optional.empty();
        }
        return Optional.of(gc);
    }

    // ── Canje transaccional ───────────────────────────────────────────────────

    /**
     * Atomically deducts {@code montoSolicitado} (capped at current balance) from
     * the gift card, creates a SplitPago record, and marks the card AGOTADA if
     * the balance reaches zero.
     *
     * Uses PESSIMISTIC_WRITE lock — safe under PgBouncer transaction mode because
     * the lock is held for the duration of the @Transactional call, not the session.
     *
     * @return the actual amount deducted
     */
    @Transactional
    public int canjear(String codigo, Pedido pedido, int montoSolicitado) {
        GiftCard gc = giftCardRepository.findByCodigoForUpdate(codigo.toUpperCase(Locale.ROOT))
            .orElseThrow(() -> new IllegalStateException("Gift card no encontrada: " + codigo));

        // Defensa en profundidad: aunque hoy los dos callers ya validan el tenant
        // antes de llegar acá (ver PaymentService), el canje en sí no debe confiar
        // en eso — una gift card jamás debe poder cubrir el pedido de otra empresa.
        Long empresaPedido = pedido.getEmpresa() != null ? pedido.getEmpresa().getId() : null;
        if (empresaPedido == null || !empresaPedido.equals(gc.getEmpresa().getId())) {
            throw new SecurityException("La gift card no pertenece a la empresa de este pedido");
        }

        if (!"ACTIVA".equals(gc.getEstado())) {
            throw new IllegalStateException("Gift card no activa (estado=" + gc.getEstado() + ")");
        }

        int disponible = gc.getSaldoActual();
        int deducido   = Math.min(montoSolicitado, disponible);

        gc.setSaldoActual(disponible - deducido);
        if (gc.getSaldoActual() == 0) gc.setEstado("AGOTADA");
        giftCardRepository.save(gc);

        SplitPago split = new SplitPago();
        split.setPedido(pedido);
        split.setGiftCard(gc);
        split.setTipo("GIFT_CARD");
        split.setMonto(deducido);
        split.setReferencia(gc.getCodigo());
        splitPagoRepository.save(split);

        return deducido;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Returns a map suitable for JSON serialization to the frontend. */
    public Map<String, Object> toMap(GiftCard gc) {
        return Map.of(
            "id",               gc.getId(),
            "codigo",           gc.getCodigo(),
            "saldoInicial",     gc.getSaldoInicial(),
            "saldoActual",      gc.getSaldoActual(),
            "estado",           gc.getEstado(),
            "fechaVencimiento", gc.getFechaVencimiento() != null ? gc.getFechaVencimiento().toString() : "",
            "fechaCreacion",    gc.getFechaCreacion() != null ? gc.getFechaCreacion().toString() : ""
        );
    }

    private String generarCodigo(Long empresaId) {
        String prefix = "GC";
        String seg1 = randomSeg(4);
        String seg2 = randomSeg(4);
        String seg3 = randomSeg(4);
        return prefix + "-" + seg1 + "-" + seg2 + "-" + seg3;
    }

    private String randomSeg(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) sb.append(CHARS.charAt(RNG.nextInt(CHARS.length())));
        return sb.toString();
    }
}
