-- V115: Comisiones alineadas a costo ONVO (tarjeta ~3.9% + fijo).
-- Emprendedor: 8% all-in (sin membresía). PYME / Negocio Plus: 4% + mensualidad.

UPDATE hot_click_plan_tb
SET comision_porcentaje = 8.00,
    descripcion = 'Plan gratuito. Comisión 8% por venta (mín. ₡400), cubre pasarela y plataforma.'
WHERE nombre = 'EMPRENDEDOR';

UPDATE hot_click_plan_tb
SET comision_porcentaje = 4.00,
    precio_mensual = 9900,
    descripcion = 'Plan para negocios en crecimiento. ₡9.900/mes + 4% por venta (cubre pasarela).'
WHERE nombre = 'PYME';

UPDATE hot_click_plan_tb
SET comision_porcentaje = 4.00,
    precio_mensual = 24900,
    descripcion = 'Plan completo. ₡24.900/mes + 4% por venta (cubre pasarela).'
WHERE nombre = 'NEGOCIO_PLUS';
