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
        // TODO[PAYXPERT-REACTIVAR]: restaurar "PAYXPERT" como default al reactivar
        String key = (nombre != null) ? nombre.toUpperCase() : "PAYPAL";
        PaymentProvider provider = registry.get(key);
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
