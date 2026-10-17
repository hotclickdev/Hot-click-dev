package com.hotclick.payment;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Registro de proveedores de pago disponibles.
 * Spring inyecta automáticamente todos los beans que implementen PaymentProvider.
 * Para agregar una nueva pasarela: implementar PaymentProvider y anotarla con @Component.
 */
@Component
public class PaymentProviderFactory {

    private final Map<String, PaymentProvider> registry;

    public PaymentProviderFactory(List<PaymentProvider> providers) {
        this.registry = providers.stream()
            .filter(p -> p.getNombre() != null)
            .collect(Collectors.toMap(p -> p.getNombre().toUpperCase(), p -> p));
    }

    public PaymentProvider get(String nombre) {
        // Sin proveedor por defecto: el cliente debe elegir explícitamente (amenazas-activas: no STRIPE implícito).
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("Elegí un método de pago");
        }
        PaymentProvider provider = registry.get(nombre.trim().toUpperCase());
        if (provider == null) {
            throw new IllegalArgumentException("Proveedor de pago no soportado: " + nombre
                + ". Disponibles: " + registry.keySet());
        }
        return provider;
    }

    public boolean soporta(String nombre) {
        return nombre != null && registry.containsKey(nombre.toUpperCase());
    }
}
