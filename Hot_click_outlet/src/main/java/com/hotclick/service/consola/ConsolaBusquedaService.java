package com.hotclick.service.consola;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoItemRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ConsolaBusquedaService {

    private final PedidoRepository pedidoRepo;
    private final EmpresaRepository empresaRepo;
    private final UsuarioRepository usuarioRepo;
    private final PedidoItemRepository itemRepo;
    private final NotaOperadorService notaService;
    private final ConsolaCrmContactos contactos;

    public ConsolaBusquedaService(PedidoRepository pedidoRepo,
                                  EmpresaRepository empresaRepo,
                                  UsuarioRepository usuarioRepo,
                                  PedidoItemRepository itemRepo,
                                  NotaOperadorService notaService,
                                  ConsolaCrmContactos contactos) {
        this.pedidoRepo = pedidoRepo;
        this.empresaRepo = empresaRepo;
        this.usuarioRepo = usuarioRepo;
        this.itemRepo = itemRepo;
        this.notaService = notaService;
        this.contactos = contactos;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> buscar(String q) {
        if (q == null || q.isBlank()) return Map.of("tipo", "vacio");
        String texto = q.trim();
        Optional<Pedido> pedido = pedidoRepo.findByNumeroPedido(texto);
        if (pedido.isPresent()) return destino("pedido", pedido.get().getId(), pedido.get().getNumeroPedido());
        Optional<Usuario> porCedula = usuarioRepo.findByIdentificacion(texto);
        if (porCedula.isPresent()) return destino("comprador", porCedula.get().getId(), porCedula.get().getNombre());
        List<Empresa> tiendas = empresaRepo.buscarPorNombre(texto, PageRequest.of(0, 1));
        if (!tiendas.isEmpty()) return destino("tienda", tiendas.get(0).getId(), nombre(tiendas.get(0)));
        List<Usuario> personas = usuarioRepo.buscarClientes(texto);
        if (!personas.isEmpty()) return destino("comprador", personas.get(0).getId(), personas.get(0).getNombre());
        return Map.of("tipo", "vacio", "q", texto);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> reloj() {
        LocalDateTime limite = DiaHabil.haceUno(LocalDateTime.now(Constants.ZONA_CR));
        List<Map<String, Object>> filas = pedidoRepo.findPagadosSinMovimiento(limite).stream()
            .limit(20)
            .map(this::filaReloj)
            .toList();
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("pedidosSinTocar", filas.size());
        mapa.put("filas", filas);
        return mapa;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> crm() {
        LocalDateTime limite = DiaHabil.haceUno(LocalDateTime.now(Constants.ZONA_CR));
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("porContactar", pedidoRepo.findPagadosSinMovimiento(limite).size());
        mapa.put("esperandoStock", itemRepo.countBySinInventarioTrue());
        mapa.put("enEntrega", pedidoRepo.countByEstadoPedido("ENVIADO"));
        mapa.put("reclamo", pedidoRepo.countByEstadoPedido("RECLAMO"));
        mapa.put("notas", notaService.recientes());
        mapa.put("contactos", contactos.listar());
        return mapa;
    }

    private Map<String, Object> filaReloj(Pedido pedido) {
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("id", pedido.getId());
        mapa.put("numero", pedido.getNumeroPedido());
        mapa.put("fecha", pedido.getFechaPedido());
        mapa.put("empresaId", pedido.getEmpresaId());
        mapa.put("empresaNombre", pedido.getNombreNegocio());
        return mapa;
    }

    private static Map<String, Object> destino(String tipo, Long id, String etiqueta) {
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("tipo", tipo);
        mapa.put("id", id);
        mapa.put("etiqueta", etiqueta);
        return mapa;
    }

    private static String nombre(Empresa empresa) {
        if (empresa.getNombreComercial() != null && !empresa.getNombreComercial().isBlank()) {
            return empresa.getNombreComercial();
        }
        return empresa.getNombreEmpresa();
    }
}
