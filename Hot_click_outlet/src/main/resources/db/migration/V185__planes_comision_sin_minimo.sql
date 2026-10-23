-- V185 aprobado por el dueño (HOT_CLICK). CI/CD debe reconfirmar contra origin/master justo antes del merge que no exista otra V185 ni una versión mayor ya aplicada.
-- Planes 22-oct-2026: Emprendedor 9 %, Pyme 7,5 %, Negocio Plus 6 %, sin mínimo por venta.
-- Aditiva: no se borra comision_minima_crc (queda en 0, solo historia). V168 no se edita.
-- Los pedidos ya liquidados no se recalculan: la comisión cobrada vive en el wallet/ledger.

UPDATE hot_click_plan_tb SET comision_porcentaje = 9.00, comision_minima_crc = 0,
       descripcion = 'Mensualidad en dólares + 9% por venta, sin mínimo.'
 WHERE nombre = 'EMPRENDEDOR';
UPDATE hot_click_plan_tb SET comision_porcentaje = 7.50, comision_minima_crc = 0,
       descripcion = 'Mensualidad en dólares + 7,5% por venta, sin mínimo.'
 WHERE nombre = 'PYME';
UPDATE hot_click_plan_tb SET comision_porcentaje = 6.00, comision_minima_crc = 0,
       descripcion = 'Mensualidad en dólares + 6% por venta sin tope, sin mínimo.'
 WHERE nombre = 'NEGOCIO_PLUS';

