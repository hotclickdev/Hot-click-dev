package com.hotclick.service.consola;

import com.hotclick.exception.EnlaceNoVigenteException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TiendaRapida;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.TiendaRapidaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TiendaRapidaService {

    private final TiendaRapidaRepository rapidas;
    private final EmpresaRepository empresas;
    private final UsuarioRepository usuarios;
    private final MiembroEmpresaRepository miembros;
    private final RolRepository roles;
    private final PlanRepository planes;
    private final PasswordEncoder claves;
    private final SecureRandom aleatorio = new SecureRandom();

    public TiendaRapidaService(TiendaRapidaRepository rapidas,
                               EmpresaRepository empresas,
                               UsuarioRepository usuarios,
                               MiembroEmpresaRepository miembros,
                               RolRepository roles,
                               PlanRepository planes,
                               PasswordEncoder claves) {
        this.rapidas = rapidas;
        this.empresas = empresas;
        this.usuarios = usuarios;
        this.miembros = miembros;
        this.roles = roles;
        this.planes = planes;
        this.claves = claves;
    }

    @Transactional
    public List<Map<String, Object>> listar() {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        return rapidas.findAllByOrderByCreadaDesc().stream()
            .map(fila -> mapa(cerrarUna(fila, ahora), true))
            .toList();
    }

    @Transactional
    public Map<String, Object> crear(String negocio, String persona, String telefono, Integer dias) {
        return crear(negocio, persona, telefono, dias, null);
    }

    /**
     * Crea el negocio y su enlace de asignación de un solo uso. El token solo viaja en esta
     * respuesta; en la base queda su SHA-256.
     */
    @Transactional
    public Map<String, Object> crear(String negocio, String persona, String telefono, Integer dias, Long creadoPor) {
        String nombre = TiendaRapidaReglas.nombre(negocio, "El negocio");
        String dueno = TiendaRapidaReglas.nombre(persona, "La persona");
        String cel = TiendaRapidaReglas.telefono(telefono);
        int plazo = TiendaRapidaReglas.dias(dias);
        String token = tokenNuevo();
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        String semilla = tokenNuevo();
        Empresa empresa = guardarEmpresa(nombre, cel, semilla);
        Usuario usuario = guardarUsuario(dueno, cel, semilla, empresa);
        miembros.save(new MiembroEmpresa(usuario, empresa, "PROPIETARIO"));
        TiendaRapida fila = guardarFila(empresa, usuario, dueno, cel, plazo, token, ahora);
        fila.setCreadoPor(creadoPor);
        return conToken(mapa(fila, true), token);
    }

    /** Nuevo enlace para una asignación aún no aceptada; el anterior deja de servir. */
    @Transactional
    public Map<String, Object> regenerar(Long id) {
        TiendaRapida fila = rapidas.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("No existe esa tienda rápida."));
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        cerrarUna(fila, ahora);
        if (fila.getUsadoEn() != null) {
            throw new EnlaceNoVigenteException(HttpStatus.CONFLICT, "Ese negocio ya fue asignado.");
        }
        if (TiendaRapidaReglas.VENCIDA.equals(fila.getEstado())) {
            throw new EnlaceNoVigenteException(HttpStatus.GONE, "El plazo de esa tienda ya se cumplió.");
        }
        String token = tokenNuevo();
        fila.setToken(null);
        fila.setTokenHash(TiendaRapidaReglas.hashToken(token));
        fila.setEnlaceVence(vencimientoEnlace(ahora, fila.getVence()));
        fila.setRevocadoEn(null);
        return conToken(mapa(fila, true), token);
    }

    /** Anula el enlace vigente sin tocar el negocio. */
    @Transactional
    public Map<String, Object> revocar(Long id) {
        TiendaRapida fila = rapidas.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("No existe esa tienda rápida."));
        if (fila.getUsadoEn() != null) {
            throw new EnlaceNoVigenteException(HttpStatus.CONFLICT, "Ese negocio ya fue asignado.");
        }
        if (fila.getRevocadoEn() == null) fila.setRevocadoEn(LocalDateTime.now(Constants.ZONA_CR));
        return mapa(fila, true);
    }

    @Transactional
    public Map<String, Object> ver(String token) {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        TiendaRapida fila = cerrarUna(exigir(token), ahora);
        exigirVigente(fila, ahora);
        Map<String, Object> datos = mapa(fila, false);
        datos.put("versionLegal", TiendaRapidaReglas.VERSION_LEGAL);
        return datos;
    }

    /**
     * Quien abre el enlace acepta ser dueño o representante legal y responsable de la marca,
     * completa sus datos y el enlace queda consumido (una sola vez, en la misma transacción).
     */
    @Transactional
    public Map<String, Object> aceptar(String token, boolean acepto, String versionLegal, String ipHash,
                                       String persona, String cedula, String correo, String telefono, String clave) {
        if (!acepto) {
            throw new IllegalArgumentException("Para seguir tenés que aceptar ser el dueño o representante legal del negocio.");
        }
        if (versionLegal != null && !versionLegal.isBlank() && !TiendaRapidaReglas.VERSION_LEGAL.equals(versionLegal)) {
            throw new IllegalArgumentException("El texto que aceptaste cambió. Recargá la página.");
        }
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        TiendaRapida fila = cerrarUna(exigir(token), ahora);
        exigirVigente(fila, ahora);
        aplicarDatos(fila, persona, cedula, correo, telefono, clave);
        if (rapidas.consumir(fila.getId(), ahora) != 1) {
            throw new EnlaceNoVigenteException(HttpStatus.CONFLICT, "Este enlace ya se usó.");
        }
        fila.setUsadoEn(ahora);
        fila.setAceptadoEn(ahora);
        fila.setAceptadoIpHash(ipHash);
        fila.setAceptadoPor(fila.getUsuario().getId());
        fila.setVersionLegal(TiendaRapidaReglas.VERSION_LEGAL);
        Map<String, Object> datos = mapa(fila, false);
        datos.put("correo", fila.getUsuario().getCorreo());
        return datos;
    }

    private void aplicarDatos(TiendaRapida fila, String persona, String cedula,
                              String correo, String telefono, String clave) {
        String dueno = TiendaRapidaReglas.nombre(persona, "El nombre");
        String id = TiendaRapidaReglas.cedula(cedula);
        String mail = TiendaRapidaReglas.correo(correo);
        String cel = TiendaRapidaReglas.telefono(telefono);
        Usuario usuario = fila.getUsuario();
        if (usuarios.existsByCorreo(mail) && !mail.equalsIgnoreCase(usuario.getCorreo())) {
            throw new IllegalArgumentException("Ese correo ya tiene una cuenta.");
        }
        Empresa empresa = fila.getEmpresa();
        if (empresas.existsByCorreoEmpresa(mail) && !mail.equalsIgnoreCase(empresa.getCorreoEmpresa())) {
            throw new IllegalArgumentException("Ese correo ya tiene una tienda.");
        }
        if (usuarios.existsByIdentificacion(id) && !id.equals(usuario.getIdentificacion())) {
            throw new IllegalArgumentException("Esa cédula ya está registrada.");
        }
        String[] partes = partes(dueno);
        usuario.setNombre(partes[0]);
        usuario.setApellidoPaterno(partes[1]);
        usuario.setIdentificacion(id);
        usuario.setCorreo(mail);
        usuario.setTelefono(cel);
        usuario.setContrasenaHash(claves.encode(TiendaRapidaReglas.clave(clave)));
        usuario.setCorreoVerificado(true);
        empresa.setCorreoEmpresa(mail);
        empresa.setTelefonoEmpresa(cel);
        empresa.setRucCedula(id);
        empresa.setCedulaJuridica(id);
        empresa.setTipoCedula(id.length() > 9 ? "02" : "01");
        fila.setPersona(dueno);
        fila.setTelefono(cel);
        fila.setEstado(TiendaRapidaReglas.LISTA);
    }

    private TiendaRapida guardarFila(Empresa empresa, Usuario usuario, String dueno, String cel,
                                     int plazo, String token, LocalDateTime ahora) {
        TiendaRapida fila = new TiendaRapida();
        fila.setEmpresa(empresa);
        fila.setUsuario(usuario);
        fila.setPersona(dueno);
        fila.setTelefono(cel);
        fila.setDias(plazo);
        fila.setVence(ahora.plusDays(plazo));
        fila.setTokenHash(TiendaRapidaReglas.hashToken(token));
        fila.setEnlaceVence(vencimientoEnlace(ahora, fila.getVence()));
        fila.setEstado(TiendaRapidaReglas.ESPERANDO);
        fila.setCreada(ahora);
        return rapidas.save(fila);
    }

    private Empresa guardarEmpresa(String nombre, String cel, String token) {
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa(nombre);
        empresa.setNombreComercial(nombre);
        empresa.setSlug(slugDe(nombre));
        empresa.setCorreoEmpresa(correoInterno(token));
        empresa.setTelefonoEmpresa(cel);
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setEstadoPlan("ACTIVO");
        empresa.setEstadoEmpresa(TiendaRapidaReglas.ESTADO_EMPRESA);
        empresa.setVisibilidadPublica(false);
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa.setEstado(Constants.ESTADO_ACTIVO);
        planes.findByNombre("EMPRENDEDOR").ifPresent(empresa::setPlan);
        return empresas.save(empresa);
    }

    private Usuario guardarUsuario(String dueno, String cel, String token, Empresa empresa) {
        String[] partes = partes(dueno);
        Usuario usuario = new Usuario();
        usuario.setNombre(partes[0]);
        usuario.setApellidoPaterno(partes[1]);
        usuario.setIdentificacion(identificacionInterna(token));
        usuario.setCorreo(correoInterno(token));
        usuario.setTelefono(cel);
        usuario.setContrasenaHash(claves.encode(tokenNuevo()));
        usuario.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuario.setIntentosFallidos(0);
        usuario.setEmpresa(empresa);
        usuario.setCorreoVerificado(false);
        usuario.getRoles().add(roles.findByNombreRol(Constants.ROL_EMPRENDEDOR)
            .orElseThrow(() -> new IllegalStateException("Rol EMPRENDEDOR no configurado")));
        return usuarios.save(usuario);
    }

    private TiendaRapida cerrarUna(TiendaRapida fila, LocalDateTime ahora) {
        if (!fila.getVence().isBefore(ahora) || TiendaRapidaReglas.VENCIDA.equals(fila.getEstado())) return fila;
        fila.setEstado(TiendaRapidaReglas.VENCIDA);
        Empresa empresa = fila.getEmpresa();
        if (empresa != null && TiendaRapidaReglas.ESTADO_EMPRESA.equals(empresa.getEstadoEmpresa())) {
            empresa.setEstadoEmpresa("INACTIVO");
            empresa.setVisibilidadPublica(false);
        }
        return fila;
    }

    private TiendaRapida exigir(String token) {
        String limpio = TiendaRapidaReglas.token(token);
        String hash = TiendaRapidaReglas.hashToken(limpio);
        return rapidas.findByTokenHash(hash)
            .or(() -> rapidas.findByToken(limpio).map(fila -> migrarEnlaceViejo(fila, hash)))
            .orElseThrow(() -> new RecursoNoEncontradoException("Ese enlace no está vigente."));
    }

    /** Enlaces de V157 guardaban el token en claro: al primer uso pasan a hash. */
    private static TiendaRapida migrarEnlaceViejo(TiendaRapida fila, String hash) {
        fila.setTokenHash(hash);
        fila.setToken(null);
        if (fila.getEnlaceVence() == null) fila.setEnlaceVence(fila.getVence());
        return fila;
    }

    private static void exigirVigente(TiendaRapida fila, LocalDateTime ahora) {
        switch (estadoEnlace(fila, ahora)) {
            case "USADO" -> throw new EnlaceNoVigenteException(HttpStatus.CONFLICT, "Este enlace ya se usó.");
            case "REVOCADO" -> throw new EnlaceNoVigenteException(HttpStatus.GONE, "Este enlace fue anulado.");
            case "VENCIDO" -> throw new EnlaceNoVigenteException(HttpStatus.GONE, "Este enlace venció.");
            default -> { /* VIGENTE: se puede usar */ }
        }
    }

    static String estadoEnlace(TiendaRapida fila, LocalDateTime ahora) {
        if (fila.getUsadoEn() != null || TiendaRapidaReglas.LISTA.equals(fila.getEstado())) return "USADO";
        if (fila.getRevocadoEn() != null) return "REVOCADO";
        LocalDateTime vence = fila.getEnlaceVence() != null ? fila.getEnlaceVence() : fila.getVence();
        if (TiendaRapidaReglas.VENCIDA.equals(fila.getEstado()) || !vence.isAfter(ahora)) return "VENCIDO";
        return "VIGENTE";
    }

    private static LocalDateTime vencimientoEnlace(LocalDateTime ahora, LocalDateTime venceTienda) {
        LocalDateTime enlace = ahora.plusHours(TiendaRapidaReglas.HORAS_ENLACE);
        return venceTienda != null && venceTienda.isBefore(enlace) ? venceTienda : enlace;
    }

    private static Map<String, Object> conToken(Map<String, Object> datos, String token) {
        datos.put("token", token);
        return datos;
    }

    private Map<String, Object> mapa(TiendaRapida fila, boolean conEnlace) {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        long restantes = Math.max(0, ChronoUnit.DAYS.between(ahora.toLocalDate(), fila.getVence().toLocalDate()));
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("id", fila.getId());
        mapa.put("empresaId", fila.getEmpresa() == null ? null : fila.getEmpresa().getId());
        mapa.put("negocio", fila.getEmpresa() == null ? "" : fila.getEmpresa().getNombreComercial());
        mapa.put("persona", fila.getPersona());
        mapa.put("telefono", fila.getTelefono());
        mapa.put("dias", fila.getDias());
        mapa.put("diasRestantes", restantes);
        mapa.put("vence", fila.getVence().toString());
        mapa.put("estado", fila.getEstado());
        if (conEnlace) {
            mapa.put("estadoEnlace", estadoEnlace(fila, ahora));
            mapa.put("enlaceVence", fila.getEnlaceVence() == null ? null : fila.getEnlaceVence().toString());
            mapa.put("aceptadoEn", fila.getAceptadoEn() == null ? null : fila.getAceptadoEn().toString());
        }
        return mapa;
    }

    private String slugDe(String nombre) {
        String base = Normalizer.normalize(nombre.toLowerCase(), Normalizer.Form.NFD)
            .replaceAll("[^\\p{ASCII}]", "")
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("(^-)|(-$)", "");
        if (base.isBlank()) base = "tienda";
        if (base.length() > 70) base = base.substring(0, 70);
        String slug = base;
        int i = 2;
        while (empresas.existsBySlug(slug) && i < 40) {
            slug = base + "-" + i;
            i++;
        }
        return slug;
    }

    private String tokenNuevo() {
        byte[] bytes = new byte[18];
        aleatorio.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String correoInterno(String token) {
        String semilla = token.replaceAll("[^A-Za-z0-9]", "").toLowerCase();
        return "rapida-" + semilla.substring(0, Math.min(12, semilla.length())) + "@temporal.hotclick.local";
    }

    private static String identificacionInterna(String token) {
        String semilla = token.replaceAll("[^A-Za-z0-9]", "");
        return ("TMP" + semilla + "000000000000").substring(0, 15);
    }

    private static String[] partes(String persona) {
        String[] trozos = persona.trim().split("\\s+", 2);
        String nombre = trozos[0].length() > 50 ? trozos[0].substring(0, 50) : trozos[0];
        String apellido = trozos.length > 1 ? trozos[1] : "Titular";
        if (apellido.length() > 50) apellido = apellido.substring(0, 50);
        return new String[] { nombre, apellido };
    }
}
