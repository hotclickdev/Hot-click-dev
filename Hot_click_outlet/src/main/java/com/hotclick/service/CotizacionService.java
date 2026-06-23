package com.hotclick.service;

import com.hotclick.dto.CotizacionB2BRequestDTO;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@SuppressWarnings("null")
public class CotizacionService {

    @Autowired private CotizacionRepository           cotizacionRepository;
    @Autowired private CotizacionClienteRepository    clienteRepository;
    @Autowired private ProductoRepository             productoRepository;
    @Autowired private EmpresaRepository              empresaRepository;
    @PersistenceContext private EntityManager          em;

    // ── Consecutivo PgBouncer-safe ───────────────────────────────────────────────

    @Transactional
    public String generarConsecutivo(Long empresaId) {
        em.createNativeQuery(
            "INSERT INTO hot_click_cotizacion_consecutivo_tb(empresa_id, ultimo_numero) " +
            "VALUES (:eid, 1) " +
            "ON CONFLICT (empresa_id) DO UPDATE " +
            "SET ultimo_numero = hot_click_cotizacion_consecutivo_tb.ultimo_numero + 1"
        ).setParameter("eid", empresaId).executeUpdate();

        Number numero = (Number) em.createNativeQuery(
            "SELECT ultimo_numero FROM hot_click_cotizacion_consecutivo_tb WHERE empresa_id = :eid"
        ).setParameter("eid", empresaId).getSingleResult();

        return String.format("COT-%06d", numero.longValue());
    }

    // ── CRUD cotizaciones ────────────────────────────────────────────────────────

    @Transactional
    public Cotizacion crear(CotizacionB2BRequestDTO dto, Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada"));

        CotizacionCliente cliente = clienteRepository.findById(dto.getClienteId())
            .filter(c -> c.getEmpresa().getId().equals(empresaId))
            .orElseThrow(() -> new NoSuchElementException("Cliente no encontrado"));

        Cotizacion c = new Cotizacion();
        c.setEmpresa(empresa);
        c.setCliente(cliente);
        c.setNumeroCotizacion(generarConsecutivo(empresaId));
        c.setFechaEmision(dto.getFechaEmision() != null ? dto.getFechaEmision() : LocalDate.now());
        c.setFechaVencimiento(dto.getFechaVencimiento());
        c.setEstadoCotizacion(dto.getEstadoCotizacion() != null ? dto.getEstadoCotizacion() : Cotizacion.ESTADO_BORRADOR);
        c.setAplicaIva(Boolean.TRUE.equals(dto.getAplicaIva()));
        c.setPorcentajeIva(dto.getPorcentajeIva() != null ? dto.getPorcentajeIva() : 13);
        c.setObservaciones(dto.getObservaciones());
        c.setTerminos(dto.getTerminos());
        c.setMoneda(dto.getMoneda() != null ? dto.getMoneda() : "CRC");
        c.setEstado(Constants.ESTADO_ACTIVO);

        // Legacy compat
        c.setNombreCliente(cliente.getNombreComercial());
        c.setTelefono(cliente.getTelefono());

        mapearItems(c, dto.getItems());
        calcularTotales(c);

        return cotizacionRepository.save(c);
    }

    @Transactional
    public Cotizacion actualizar(Long id, CotizacionB2BRequestDTO dto, Long empresaId) {
        Cotizacion c = cotizacionRepository.findByIdAndEmpresaId(id, empresaId)
            .orElseThrow(() -> new NoSuchElementException("Cotización no encontrada"));

        if (dto.getClienteId() != null) {
            CotizacionCliente cliente = clienteRepository.findById(dto.getClienteId())
                .filter(cl -> cl.getEmpresa().getId().equals(empresaId))
                .orElseThrow(() -> new NoSuchElementException("Cliente no encontrado"));
            c.setCliente(cliente);
            c.setNombreCliente(cliente.getNombreComercial());
            c.setTelefono(cliente.getTelefono());
        }

        if (dto.getFechaEmision()    != null) c.setFechaEmision(dto.getFechaEmision());
        if (dto.getFechaVencimiento() != null) c.setFechaVencimiento(dto.getFechaVencimiento());
        if (dto.getEstadoCotizacion() != null) c.setEstadoCotizacion(dto.getEstadoCotizacion());
        if (dto.getAplicaIva()       != null) c.setAplicaIva(dto.getAplicaIva());
        if (dto.getPorcentajeIva()   != null) c.setPorcentajeIva(dto.getPorcentajeIva());
        if (dto.getObservaciones()   != null) c.setObservaciones(dto.getObservaciones());
        if (dto.getTerminos()        != null) c.setTerminos(dto.getTerminos());
        if (dto.getMoneda()          != null) c.setMoneda(dto.getMoneda());

        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            c.getItems().clear();
            mapearItems(c, dto.getItems());
        }

        calcularTotales(c);
        return cotizacionRepository.save(c);
    }

    @Transactional
    public Cotizacion cambiarEstado(Long id, String nuevoEstado, Long empresaId) {
        Cotizacion c = cotizacionRepository.findByIdAndEmpresaId(id, empresaId)
            .orElseThrow(() -> new NoSuchElementException("Cotización no encontrada"));
        c.setEstadoCotizacion(nuevoEstado);
        return cotizacionRepository.save(c);
    }

    @Transactional
    public Cotizacion duplicar(Long id, Long empresaId) {
        Cotizacion original = cotizacionRepository.findByIdAndEmpresaId(id, empresaId)
            .orElseThrow(() -> new NoSuchElementException("Cotización no encontrada"));

        Cotizacion copia = new Cotizacion();
        copia.setEmpresa(original.getEmpresa());
        copia.setCliente(original.getCliente());
        copia.setNumeroCotizacion(generarConsecutivo(empresaId));
        copia.setFechaEmision(LocalDate.now());
        copia.setFechaVencimiento(LocalDate.now().plusDays(30));
        copia.setEstadoCotizacion(Cotizacion.ESTADO_BORRADOR);
        copia.setAplicaIva(original.getAplicaIva());
        copia.setPorcentajeIva(original.getPorcentajeIva());
        copia.setObservaciones(original.getObservaciones());
        copia.setTerminos(original.getTerminos());
        copia.setMoneda(original.getMoneda());
        copia.setNombreCliente(original.getNombreCliente());
        copia.setTelefono(original.getTelefono());
        copia.setEstado(Constants.ESTADO_ACTIVO);

        for (CotizacionItem item : original.getItems()) {
            CotizacionItem nuevo = new CotizacionItem();
            nuevo.setCotizacion(copia);
            nuevo.setTipo(item.getTipo());
            nuevo.setProducto(item.getProducto());
            nuevo.setCodigo(item.getCodigo());
            nuevo.setNombre(item.getNombre());
            nuevo.setDescripcion(item.getDescripcion());
            nuevo.setImagenUrl(item.getImagenUrl());
            nuevo.setCantidad(item.getCantidad());
            nuevo.setUnidadMedida(item.getUnidadMedida());
            nuevo.setPrecioUnitario(item.getPrecioUnitario());
            nuevo.setDescuentoPorcentaje(item.getDescuentoPorcentaje());
            nuevo.setSubtotalLinea(item.getSubtotalLinea());
            nuevo.setOrden(item.getOrden());
            copia.getItems().add(nuevo);
        }

        calcularTotales(copia);
        return cotizacionRepository.save(copia);
    }

    @Transactional
    public void eliminar(Long id, Long empresaId) {
        Cotizacion c = cotizacionRepository.findByIdAndEmpresaId(id, empresaId)
            .orElseThrow(() -> new NoSuchElementException("Cotización no encontrada"));
        c.setEstado(Constants.ESTADO_INACTIVO);
        cotizacionRepository.save(c);
    }

    // ── Consultas ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Cotizacion> listar(Long empresaId, String estadoCot) {
        return cotizacionRepository.findB2BByEmpresa(empresaId, estadoCot);
    }

    @Transactional(readOnly = true)
    public Cotizacion buscarPorId(Long id, Long empresaId) {
        return cotizacionRepository.findByIdAndEmpresaId(id, empresaId)
            .orElseThrow(() -> new NoSuchElementException("Cotización no encontrada"));
    }

    @Transactional(readOnly = true)
    public Cotizacion buscarPorToken(UUID token) {
        return cotizacionRepository.findByTokenPublico(token)
            .orElseThrow(() -> new NoSuchElementException("Cotización no encontrada"));
    }

    @Transactional(readOnly = true)
    public Map<String, Long> kpis(Long empresaId) {
        Map<String, Long> k = new LinkedHashMap<>();
        k.put("borrador",  cotizacionRepository.countByEmpresaIdAndEstadoAndEstadoCotizacion(empresaId, 1, Cotizacion.ESTADO_BORRADOR));
        k.put("enviada",   cotizacionRepository.countByEmpresaIdAndEstadoAndEstadoCotizacion(empresaId, 1, Cotizacion.ESTADO_ENVIADA));
        k.put("aprobada",  cotizacionRepository.countByEmpresaIdAndEstadoAndEstadoCotizacion(empresaId, 1, Cotizacion.ESTADO_APROBADA));
        k.put("rechazada", cotizacionRepository.countByEmpresaIdAndEstadoAndEstadoCotizacion(empresaId, 1, Cotizacion.ESTADO_RECHAZADA));
        return k;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private void mapearItems(Cotizacion cotizacion, List<CotizacionB2BRequestDTO.ItemDTO> dtos) {
        List<Long> productoIds = dtos.stream()
            .filter(d -> CotizacionItem.TIPO_CATALOGO.equals(d.getTipo()) && d.getProductoId() != null)
            .map(CotizacionB2BRequestDTO.ItemDTO::getProductoId)
            .toList();

        Map<Long, Producto> productoMap = productoIds.isEmpty()
            ? Collections.emptyMap()
            : productoRepository.findAllById(productoIds).stream()
                .collect(java.util.stream.Collectors.toMap(Producto::getId, p -> p));

        int orden = 0;
        for (CotizacionB2BRequestDTO.ItemDTO dto : dtos) {
            CotizacionItem item = new CotizacionItem();
            item.setCotizacion(cotizacion);
            item.setTipo(dto.getTipo() != null ? dto.getTipo() : CotizacionItem.TIPO_CATALOGO);
            item.setOrden(orden++);
            item.setCantidad(dto.getCantidad() != null ? dto.getCantidad() : 1);
            item.setUnidadMedida(dto.getUnidadMedida() != null ? dto.getUnidadMedida() : "UNIDAD");
            item.setDescuentoPorcentaje(dto.getDescuentoPorcentaje() != null ? dto.getDescuentoPorcentaje() : 0);

            if (CotizacionItem.TIPO_CATALOGO.equals(item.getTipo()) && dto.getProductoId() != null) {
                Producto p = productoMap.get(dto.getProductoId());
                if (p != null) {
                    item.setProducto(p);
                    item.setCodigo(dto.getCodigo() != null ? dto.getCodigo() : p.getSku());
                    item.setNombre(dto.getNombre() != null ? dto.getNombre() : p.getNombreProducto());
                    item.setDescripcion(dto.getDescripcion() != null ? dto.getDescripcion() : p.getDescripcionCorta());
                    item.setImagenUrl(dto.getImagenUrl() != null ? dto.getImagenUrl() : p.getImagenPrincipalUrl());
                    item.setPrecioUnitario(dto.getPrecioUnitario() != null ? dto.getPrecioUnitario() : p.getPrecioVenta());
                } else {
                    poblarItemTemporal(item, dto);
                }
            } else {
                poblarItemTemporal(item, dto);
            }

            int base     = item.getPrecioUnitario() * item.getCantidad();
            int descuento = base * item.getDescuentoPorcentaje() / 100;
            item.setSubtotalLinea(base - descuento);
            cotizacion.getItems().add(item);
        }
    }

    private void poblarItemTemporal(CotizacionItem item, CotizacionB2BRequestDTO.ItemDTO dto) {
        item.setTipo(CotizacionItem.TIPO_TEMPORAL);
        item.setCodigo(dto.getCodigo());
        item.setNombre(dto.getNombre() != null ? dto.getNombre() : "Ítem sin nombre");
        item.setDescripcion(dto.getDescripcion());
        item.setImagenUrl(dto.getImagenUrl());
        item.setPrecioUnitario(dto.getPrecioUnitario() != null ? dto.getPrecioUnitario() : 0);
    }

    private void calcularTotales(Cotizacion c) {
        int subtotal = c.getItems().stream().mapToInt(CotizacionItem::getSubtotalLinea).sum();
        c.setSubtotal(subtotal);

        int iva = 0;
        if (Boolean.TRUE.equals(c.getAplicaIva())) {
            int pct = c.getPorcentajeIva() != null ? c.getPorcentajeIva() : 13;
            iva = subtotal * pct / 100;
        }
        c.setMontoIva(iva);
        c.setTotal(subtotal + iva);
    }
}
