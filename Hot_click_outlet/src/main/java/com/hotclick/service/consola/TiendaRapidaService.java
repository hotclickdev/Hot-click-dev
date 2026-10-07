package com.hotclick.service.consola;

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
        String nombre = TiendaRapidaReglas.nombre(negocio, "El negocio");
        String dueno = TiendaRapidaReglas.nombre(persona, "La persona");
        String cel = TiendaRapidaReglas.telefono(telefono);
        int plazo = TiendaRapidaReglas.dias(dias);
        String token = tokenNuevo();
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        Empresa empresa = guardarEmpresa(nombre, cel, token);
        Usuario usuario = guardarUsuario(dueno, cel, token, empresa);
        miembros.save(new MiembroEmpresa(usuario, empresa, "PROPIETARIO"));
        return mapa(guardarFila(empresa, usuario, dueno, cel, plazo, token, ahora), true);
    }

    @Transactional
    public Map<String, Object> ver(String token) {
        TiendaRapida fila = exigir(token);
        return mapa(cerrarUna(fila, LocalDateTime.now(Constants.ZONA_CR)), false);
    }

    @Transactional
    public Map<String, Object> completar(String token, String persona, String cedula,
                                         String correo, String telefono, String clave) {
        TiendaRapida fila = cerrarUna(exigir(token), LocalDateTime.now(Constants.ZONA_CR));
        if (TiendaRapidaReglas.VENCIDA.equals(fila.getEstado())) {
            throw new IllegalArgumentException("Este plazo ya se cumplió.");
        }
        if (TiendaRapidaReglas.LISTA.equals(fila.getEstado())) {
            throw new IllegalArgumentException("Esos datos ya quedaron guardados.");
        }
        aplicarDatos(fila, persona, cedula, correo, telefono, clave);
        return mapa(fila, false);
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
        fila.setToken(token);
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
        return rapidas.findByToken(TiendaRapidaReglas.token(token))
            .orElseThrow(() -> new RecursoNoEncontradoException("Ese enlace no está vigente."));
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
        if (conEnlace) mapa.put("token", fila.getToken());
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
