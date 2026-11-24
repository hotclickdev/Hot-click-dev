package com.hotclick.agente.interno;

import com.hotclick.agente.conversacion.spi.TelefonoVinculadoResolver;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;

/**
 * Vinculación verificada de un teléfono de WhatsApp a un usuario del negocio (AG-20). El usuario genera un código
 * de un solo uso en el panel (vence en 10 min) y lo envía desde SU teléfono al número del negocio: así queda
 * probado que controla ese teléfono (el wa_id lo verifica Meta). Implementa {@link TelefonoVinculadoResolver}.
 */
@Service
public class VinculacionInternaService implements TelefonoVinculadoResolver {

    public static final Duration VIGENCIA_CODIGO = Duration.ofMinutes(10);
    private static final char[] ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int LARGO_CODIGO = 8;

    public enum Activacion { OK, CODIGO_INVALIDO, VENCIDO, USUARIO_INACTIVO, TELEFONO_EN_USO }

    public record CodigoGenerado(String codigo, Instant expira) {
        /** El código es secreto: nunca en logs. */
        @Override public String toString() { return "CodigoGenerado[expira=" + expira + "]"; }
    }

    private final AgenteVinculacionRepository repo;
    private final UsuarioRepository usuarios;
    private final HasherInterno hasher;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    @org.springframework.beans.factory.annotation.Autowired
    public VinculacionInternaService(AgenteVinculacionRepository repo, UsuarioRepository usuarios,
                                     HasherInterno hasher) {
        this(repo, usuarios, hasher, Clock.systemUTC());
    }

    VinculacionInternaService(AgenteVinculacionRepository repo, UsuarioRepository usuarios, HasherInterno hasher,
                              Clock clock) {
        this.repo = repo;
        this.usuarios = usuarios;
        this.hasher = hasher;
        this.clock = clock;
    }

    /** Código nuevo para el usuario (invalida el anterior). Solo miembros activos del negocio. */
    @Transactional
    public CodigoGenerado generarCodigo(Long usuarioId, Long empresaId) {
        exigirMiembro(usuarioId, empresaId);
        AgenteVinculacion v = obtenerOCrear(usuarioId, empresaId);
        Instant ahora = clock.instant();
        String codigo = codigoAleatorio();
        v.setCodigoHash(hasher.codigo(empresaId, codigo));
        v.setCodigoExpira(ahora.plus(VIGENCIA_CODIGO));
        if (AgenteVinculacion.REVOCADA.equals(v.getEstado())) {
            v.setEstado(AgenteVinculacion.PENDIENTE);
            v.setContactoHash(null);
            v.setContactoUltimos4(null);
        }
        repo.save(v);
        return new CodigoGenerado(codigo, v.getCodigoExpira());
    }

    /** true si hay un código vigente de esa empresa con ese valor (para decidir si un mensaje lo consume). */
    @Transactional(readOnly = true)
    public boolean existeCodigoVigente(Long empresaId, String codigo) {
        return repo.existeCodigoVigente(empresaId, hasher.codigo(empresaId, codigo), clock.instant());
    }

    /**
     * Canjea el código enviado desde {@code contacto}. El código es de un solo uso y solo vale en la empresa
     * que lo generó (el negocio al que escribió el teléfono).
     */
    @Transactional
    public Activacion activar(Long empresaId, String contacto, String codigo) {
        Optional<AgenteVinculacion> opt = repo.findPorCodigoParaActualizar(empresaId, hasher.codigo(empresaId, codigo));
        if (opt.isEmpty()) return Activacion.CODIGO_INVALIDO;
        AgenteVinculacion v = opt.get();
        Instant ahora = clock.instant();
        boolean vencido = v.getCodigoExpira() == null || !ahora.isBefore(v.getCodigoExpira());
        v.setCodigoHash(null); // de un solo uso, salga lo que salga
        v.setCodigoExpira(null);
        if (vencido) { repo.save(v); return Activacion.VENCIDO; }
        if (!usuarios.esMiembroActivoDeEmpresa(v.getUsuarioId(), empresaId)) {
            repo.save(v);
            return Activacion.USUARIO_INACTIVO;
        }
        String hash = hasher.contacto(empresaId, v.getCanal(), contacto);
        Optional<AgenteVinculacion> otro = repo.findByEmpresaIdAndCanalAndContactoHashAndEstado(
            empresaId, v.getCanal(), hash, AgenteVinculacion.ACTIVA);
        if (otro.isPresent() && !otro.get().getId().equals(v.getId())) {
            repo.save(v);
            return Activacion.TELEFONO_EN_USO;
        }
        v.setEstado(AgenteVinculacion.ACTIVA);
        v.setContactoHash(hash);
        v.setContactoUltimos4(HasherInterno.ultimos4(contacto));
        v.setFechaVinculacion(ahora);
        v.setFechaRevocacion(null);
        v.setPinIntentosFallidos(0);
        v.setPinBloqueadoHasta(null);
        v.setPinSesionHasta(null);
        v.limpiarPendiente();
        repo.save(v);
        return Activacion.OK;
    }

    /** Revoca la vinculación del usuario en esa empresa. @return false si no existía. */
    @Transactional
    public boolean revocar(Long usuarioId, Long empresaId) {
        Optional<AgenteVinculacion> opt = repo.findByUsuarioIdAndEmpresaIdAndCanal(
            usuarioId, empresaId, AgenteVinculacion.CANAL_WHATSAPP);
        if (opt.isEmpty() || AgenteVinculacion.REVOCADA.equals(opt.get().getEstado())) return false;
        AgenteVinculacion v = opt.get();
        v.setEstado(AgenteVinculacion.REVOCADA);
        v.setContactoHash(null);
        v.setCodigoHash(null);
        v.setCodigoExpira(null);
        v.setPinSesionHasta(null);
        v.limpiarPendiente();
        v.setFechaRevocacion(clock.instant());
        repo.save(v);
        return true;
    }

    @Transactional(readOnly = true)
    public Optional<AgenteVinculacion> deUsuario(Long usuarioId, Long empresaId) {
        return repo.findByUsuarioIdAndEmpresaIdAndCanal(usuarioId, empresaId, AgenteVinculacion.CANAL_WHATSAPP);
    }

    @Transactional(readOnly = true)
    public List<AgenteVinculacion> activasDeEmpresa(Long empresaId) {
        return repo.findByEmpresaIdAndEstado(empresaId, AgenteVinculacion.ACTIVA);
    }

    /**
     * Vinculación ACTIVA del teléfono en esa empresa, solo si el usuario sigue siendo miembro activo (si lo
     * sacaron del equipo, el teléfono deja de ser interno de inmediato).
     */
    @Transactional(readOnly = true)
    public Optional<AgenteVinculacion> vinculacionActiva(Long empresaId, String contacto) {
        if (empresaId == null || contacto == null || contacto.isBlank()) return Optional.empty();
        return repo.findByEmpresaIdAndCanalAndContactoHashAndEstado(empresaId, AgenteVinculacion.CANAL_WHATSAPP,
                hasher.contacto(empresaId, AgenteVinculacion.CANAL_WHATSAPP, contacto), AgenteVinculacion.ACTIVA)
            .filter(v -> usuarios.esMiembroActivoDeEmpresa(v.getUsuarioId(), empresaId));
    }

    @Override
    public OptionalLong usuarioVinculado(Long empresaId, String remitenteId) {
        return vinculacionActiva(empresaId, remitenteId)
            .map(v -> OptionalLong.of(v.getUsuarioId())).orElse(OptionalLong.empty());
    }

    @Transactional(readOnly = true)
    public AgenteVinculacion porId(Long id) {
        return repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Vinculación no encontrada"));
    }

    @Transactional
    public void guardarPendiente(Long id, String tipo, String json, Duration ttl) {
        AgenteVinculacion v = porId(id);
        v.setPendiente(tipo, json, clock.instant().plus(ttl));
        repo.save(v);
    }

    @Transactional
    public void limpiarPendiente(Long id) {
        repo.findById(id).ifPresent(v -> {
            if (v.getPendienteTipo() != null) {
                v.limpiarPendiente();
                repo.save(v);
            }
        });
    }

    private AgenteVinculacion obtenerOCrear(Long usuarioId, Long empresaId) {
        return repo.findByUsuarioIdAndEmpresaIdAndCanal(usuarioId, empresaId, AgenteVinculacion.CANAL_WHATSAPP)
            .orElseGet(() -> {
                AgenteVinculacion n = new AgenteVinculacion();
                n.setUsuarioId(usuarioId);
                n.setEmpresaId(empresaId);
                n.setFechaCreacion(clock.instant());
                return n;
            });
    }

    void exigirMiembro(Long usuarioId, Long empresaId) {
        if (usuarioId == null || empresaId == null || !usuarios.esMiembroActivoDeEmpresa(usuarioId, empresaId))
            throw new TenantAccessDeniedException("Solo el equipo del negocio puede vincular el bot interno");
    }

    private String codigoAleatorio() {
        StringBuilder sb = new StringBuilder(LARGO_CODIGO);
        for (int i = 0; i < LARGO_CODIGO; i++) sb.append(ALFABETO[random.nextInt(ALFABETO.length)]);
        return sb.toString();
    }

    Instant ahora() { return clock.instant(); }
}
