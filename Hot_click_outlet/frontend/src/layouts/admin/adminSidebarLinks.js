/**
 * Sidebar simplificado del "Sistema" para el dueño de negocio (rol
 * EMPRENDEDOR) — reemplaza el panel admin completo de ~30 ítems por los
 * que de verdad usa a diario, siguiendo el rediseño de
 * `Front para cliente EPN/Sistema - Inicio.dc.html`.
 * @param {Function} t i18n translate
 */
export function buildSistemaLinks(t) {
  return [
    { to: '/admin', label: 'Inicio', icon: 'home', exact: true },
    { section: 'Vender' },
    { to: '/admin/pedidos', label: 'Ventas y pedidos', icon: 'clipboard' },
    { section: 'Catálogo' },
    { to: '/admin/productos', label: t('admin.sidebar.productos'), icon: 'box' },
    { to: '/admin/ofertas',   label: 'Promociones',                icon: 'tag' },
    { section: 'Mi negocio' },
    { to: '/admin/clientes',  label: 'Clientes',                  icon: 'users' },
    { to: '/admin/blog',      label: 'Posts',                     icon: 'blog'  },
    { to: '/admin/reportes',  label: t('admin.sidebar.reportes'), icon: 'bar', feature: 'reportes' },
    { to: '/admin/copilot',   label: 'Consultas con Hot',         icon: 'copilot' },
    { section: 'Más' },
    { to: '/admin/configuracion', label: 'Configuración', icon: 'config' },
    { to: '/admin/ayuda',         label: 'Ayuda',          icon: 'help' },
  ]
}

/**
 * Devuelve los links del sidebar con secciones según el rol activo.
 * @param {Function} t i18n translate
 * @param {string} userRole
 */
export function buildSidebarLinks(t, userRole) {
  if (userRole === 'ADMIN') {
    return [
      { to: '/admin', label: 'Inicio', icon: 'home', exact: true},
      { section: 'Catálogo' },
      { to: '/admin/productos',          label: t('admin.sidebar.productos'),  icon: 'box'      },
      { to: '/admin/productos/carga-masiva', label: 'Carga masiva',           icon: 'upload'   },
      { to: '/admin/productos/importar',    label: 'Importar catálogo IA',    icon: 'import'   },
      { to: '/admin/categorias',         label: t('admin.sidebar.categorias'), icon: 'tag'      },
      { to: '/admin/marcas',             label: 'Marcas',                      icon: 'marca'    },
      { to: '/admin/bodegas',            label: t('admin.sidebar.bodegas'),    icon: 'building' },
      { to: '/admin/garantias',          label: 'Garantías',                   icon: 'shield'   },
      { to: '/admin/compras',            label: 'Compras',                     icon: 'compra'   },
      { to: '/admin/proveedores',        label: 'Proveedores',                 icon: 'proveedor'},
      { section: 'Punto de Venta' },
      { to: '/admin/pos',           label: 'Caja registradora', icon: 'pos'       },
      { to: '/admin/pos/caja',      label: 'Cuadre de caja',    icon: 'chart'     },
      { to: '/admin/pos/historial', label: 'Historial ventas',  icon: 'clipboard' },
      { section: 'Ventas' },
      { to: '/admin/pedidos',        label: t('admin.sidebar.pedidos'),    icon: 'clipboard' },
      { to: '/admin/ventas',         label: t('admin.sidebar.nuevaVenta'), icon: 'plus'     },
      { to: '/admin/clientes',       label: 'Mis Clientes',                icon: 'users'    },
      { to: '/admin/asignar-compra', label: 'Registrar compra externa',   icon: 'assign'   },
      // { to: '/admin/mesas',        label: 'Mesas / QR',                  icon: 'qr'       },  // futuro
      { to: '/admin/cotizaciones',  label: 'Cotizaciones B2B',            icon: 'doc'      },
      { to: '/admin/gift-cards',   label: 'Gift Cards',                  icon: 'gift'     },
      { to: '/admin/inventario',   label: 'AI Inventario',               icon: 'ai'       },
      { to: '/admin/copilot',      label: 'AI Copilot',                  icon: 'copilot'  },
      { to: '/admin/forecast',     label: 'AI Forecast',                 icon: 'forecast' },
      { to: '/admin/executive',    label: 'Executive BI',                icon: 'exec'     },
      { to: '/admin/finanzas',     label: t('admin.sidebar.finanzas'),   icon: 'chart'    },
      { to: '/admin/reportes',     label: t('admin.sidebar.reportes'),   icon: 'bar'      },
      { section: 'Marketing' },
      { to: '/admin/ofertas',       label: 'Ofertas',                     icon: 'tag'      },
      { to: '/admin/cupones',       label: 'Descuentos',                  icon: 'coupon'   },
      { to: '/admin/nuevo-producto', label: t('admin.sidebar.crearIA'),  icon: 'camera'   },
      { to: '/admin/publicaciones',  label: t('admin.sidebar.publicarFB'), icon: 'share'  },
      { to: '/admin/blog',          label: 'Blog',                        icon: 'blog'     },
      { to: '/admin/convenios',     label: 'Emprendimientos',             icon: 'heart'    },
      { to: '/admin/servicios',     label: 'Servicios HOT',               icon: 'wrench'   },
      { to: '/admin/testimonios',   label: 'Testimonios',                 icon: 'star'     },
      { section: 'Sistema' },
      { to: '/admin/homepage',     label: 'Homepage / Carousel',         icon: 'home'     },
      { to: '/admin/branding',     label: 'Branding / White Label',      icon: 'brand'    },
      { to: '/admin/multipais',    label: 'LATAM Multi-país',            icon: 'globe'    },
      { to: '/admin/plugins',      label: 'Plugins / Integraciones',     icon: 'plugin'   },
      { to: '/admin/pagos',        label: 'Pagos / Webhooks',            icon: 'card'     },
      { to: '/admin/usuarios',     label: t('admin.sidebar.usuarios'),   icon: 'users'    },
      { to: '/admin/empresas',     label: 'Empresas',                    icon: 'empresa'  },
      { to: '/admin/aprobaciones', label: 'Aprobaciones',                icon: 'check'    },
      { to: '/admin/security',        label: 'Security Center',             icon: 'shield'   },
      { to: '/admin/observabilidad',  label: 'Observabilidad',              icon: 'chart'    },
      { to: '/admin/facturas',     label: 'Comprobantes Electrónicos',   icon: 'card'     },
      { to: '/admin/config-fiscal', label: 'Config. Fiscal',            icon: 'config'   },
      { to: '/admin/superadmin',   label: 'Feature Flags / SaaS',        icon: 'config'   },
      { to: '/admin/ai-control',   label: 'Control IA',                  icon: 'ai'       },
      { to: '/admin/billing/planes', label: 'Planes / Billing',          icon: 'card'     },
      { to: '/admin/configuracion', label: 'Configuración',              icon: 'config'   },
    ]
  }

  // EMPRENDEDOR ve el sidebar simplificado del "Sistema" (10 ítems, igual
  // al mockup aprobado). El resto de sus páginas (Bodegas, Compras, Marcas,
  // Garantías, IA, Mi negocio, etc.) siguen accesibles por URL directa o
  // desde Configuración — no desaparecen, solo no compiten por espacio en
  // el menú principal.
  if (userRole === 'EMPRENDEDOR') {
    return buildSistemaLinks(t)
  }

  if (userRole === 'CAJERO') {
    return [
      { section: 'POS' },
      { to: '/admin/pos',           label: 'Caja registradora', icon: 'pos'       },
      { to: '/admin/pos/caja',      label: 'Cuadre de caja',    icon: 'chart'     },
      { to: '/admin/pos/historial', label: 'Historial ventas',  icon: 'clipboard' },
    ]
  }

  if (userRole === 'GERENTE' || userRole === 'SUPERVISOR') {
    return [
      { to: '/admin', label: 'Inicio', icon: 'home', exact: true },
      { section: 'POS' },
      { to: '/admin/pos',           label: 'Caja registradora', icon: 'pos'       },
      { to: '/admin/pos/caja',      label: 'Cuadre de caja',    icon: 'chart'     },
      { to: '/admin/pos/historial', label: 'Historial ventas',  icon: 'clipboard' },
      { section: 'Ventas' },
      { to: '/admin/pedidos',       label: t('admin.sidebar.pedidos'),   icon: 'clipboard' },
      { to: '/admin/finanzas',      label: t('admin.sidebar.finanzas'),  icon: 'chart'     },
      { section: 'Catálogo' },
      { to: '/admin/productos',     label: t('admin.sidebar.productos'), icon: 'box'       },
      { to: '/admin/bodegas',       label: t('admin.sidebar.bodegas'),   icon: 'building'  },
    ]
  }

  // EMPRENDEDOR
  return [
    { to: '/admin',              label: 'Inicio',                        icon: 'home', exact: true },
    { section: 'Punto de Venta' },
    { to: '/admin/pos',          label: 'Caja registradora',             icon: 'pos'       },
    { to: '/admin/pos/caja',     label: 'Cuadre de caja',                icon: 'chart'     },
    { to: '/admin/pos/historial', label: 'Historial ventas',             icon: 'clipboard' },
    // { to: '/admin/mesas',        label: 'Mesas / QR',                    icon: 'qr'        },  // futuro
    { section: 'Catálogo e inventario' },
    { to: '/admin/productos',              label: t('admin.sidebar.productos'),    icon: 'box'    },
    { to: '/admin/productos/carga-masiva', label: 'Carga masiva',                icon: 'upload' },
    { to: '/admin/productos/importar',     label: 'Importar catálogo IA',        icon: 'import' },
    { to: '/admin/nuevo-producto',         label: 'Generar producto rápido',      icon: 'camera' },
    { to: '/admin/categorias',             label: t('admin.sidebar.categorias'),  icon: 'tag'    },
    { to: '/admin/marcas',       label: 'Marcas',                        icon: 'marca'     },
    { to: '/admin/bodegas',      label: t('admin.sidebar.bodegas'),      icon: 'building'  },
    { to: '/admin/inventario',   label: 'Inventario IA',                 icon: 'ai'        },
    { to: '/admin/compras',      label: 'Compras',                       icon: 'compra'    },
    { to: '/admin/proveedores',  label: 'Proveedores',                   icon: 'proveedor' },
    { section: 'Ventas' },
    { to: '/admin/pedidos',        label: t('admin.sidebar.pedidos'),      icon: 'clipboard' },
    { to: '/admin/ventas',         label: 'Nueva venta',                   icon: 'plus'      },
    { to: '/admin/asignar-compra', label: 'Registrar compra externa',     icon: 'assign'    },
    { to: '/admin/finanzas',       label: t('admin.sidebar.finanzas'),     icon: 'chart'     },
    { to: '/admin/billetera',    label: 'Mi Billetera',                  icon: 'wallet'    },
    { to: '/admin/reportes',     label: t('admin.sidebar.reportes'),     icon: 'bar'       },
    { section: 'Marketing' },
    { to: '/admin/ofertas',      label: 'Ofertas',                       icon: 'tag'       },
    { to: '/admin/blog',         label: 'Blog',                          icon: 'blog'      },
    { section: 'Mi negocio' },
    { to: '/admin/mi-empresa',   label: 'Mi negocio',                    icon: 'empresa'   },
    { to: '/admin/configuracion', label: 'Configuración',                icon: 'config'    },
  ]
}
